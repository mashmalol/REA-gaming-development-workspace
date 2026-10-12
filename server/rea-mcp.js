/**
 * Minimal MCP client over stdio.
 *
 * REA ships only a stdio transport -- there is no HTTP endpoint -- so the browser
 * cannot reach it directly. This module owns the subprocess and speaks
 * newline-delimited JSON-RPC 2.0 to it, which is what the bridge exposes to the UI.
 */
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * `tools/list` does not carry the `surface` field, but `rea doctor`'s catalog does.
 * We snapshot it at install time so the UI can colour tools by capability family
 * without paying for a doctor run on every launch.
 */
let SURFACE_MAP = {};
try {
  SURFACE_MAP = JSON.parse(readFileSync(path.join(HERE, 'tool-surfaces.json'), 'utf8')).map ?? {};
} catch {
  SURFACE_MAP = {};
}

const NAME_HINTS = [
  [/adb_/, 'adb-provider'],
  [/apktool|android_/, 'android-provider'],
  [/jeb_/, 'jeb-provider'],
  [/firmware|pe_resources|macho|signature/, 'firmware-provider'],
  [/web_/, 'browser-provider'],
  [/electron_|javascript_/, 'electron-provider'],
  [/runtime_/, 'runtime-provider'],
  [/managed_|keyed_archive|interface_builder|asset_catalog|dylib/, 'managed-provider'],
  [/native_|objc|swift|read_bytes|segment|macho/, 'native-provider'],
];

function inferSurface(name) {
  for (const [re, surface] of NAME_HINTS) if (re.test(name)) return surface;
  return 'session';
}

export const REA_VERSION = process.env.REA_VERSION || '6.4.0';
const BOOT_TIMEOUT_MS = 90_000;
const CALL_TIMEOUT_MS = 300_000;

export class ReaMcpClient extends EventEmitter {
  constructor({ version = REA_VERSION, command = 'npx' } = {}) {
    super();
    this.version = version;
    this.command = command;
    this.proc = null;
    this.state = 'stopped'; // stopped | starting | ready | error
    this.lastError = null;
    this.pending = new Map();
    this.buffer = '';
    this.nextId = 1;
    this.initId = null;
    this._boot = null;
    this._tools = null;
  }

  status() {
    return {
      state: this.state,
      pid: this.proc?.pid ?? null,
      version: this.version,
      toolCount: this._tools?.length ?? null,
      lastError: this.lastError,
    };
  }

  cachedTools() {
    return this._tools;
  }

  setCachedTools(tools) {
    this._tools = tools;
  }

  async ensure() {
    if (this.proc && this.state === 'ready') return;
    if (!this._boot) {
      this._boot = this._spawn().finally(() => {
        this._boot = null;
      });
    }
    return this._boot;
  }

  async _spawn() {
    const args = ['-y', `rea-agents@${this.version}`, 'mcp'];
    this.state = 'starting';
    this.emit('log', `spawning ${this.command} ${args.join(' ')}`);

    const proc = spawn(this.command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });
    this.proc = proc;

    const booted = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('REA MCP did not complete initialize in time'));
      }, BOOT_TIMEOUT_MS);
      this._resolveInit = (v) => {
        clearTimeout(timer);
        resolve(v);
      };
      this._rejectInit = (e) => {
        clearTimeout(timer);
        reject(e);
      };
    });

    proc.stdout.on('data', (chunk) => this._ingest(chunk));
    proc.stderr.on('data', (c) => this.emit('log', c.toString().trimEnd()));

    proc.on('error', (err) => {
      this.lastError = err.message;
      this.state = 'error';
      this._rejectInit?.(err);
      this._rejectAll(err.message);
    });

    proc.on('exit', (code, signal) => {
      this.emit('log', `REA MCP exited (code=${code} signal=${signal})`);
      this.state = 'stopped';
      this.proc = null;
      this._tools = null;
      this._rejectInit?.(new Error(`REA MCP exited during startup (code=${code})`));
      this._rejectAll(`REA MCP exited (code=${code}, signal=${signal})`);
    });

    this.initId = this.nextId++;
    this._write({
      jsonrpc: '2.0',
      id: this.initId,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'rea-arcade', version: '0.1.0' },
      },
    });

    const result = await booted;
    this.state = 'ready';
    this.lastError = null;
    this._write({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} });
    this.emit('log', `connected to ${result?.serverInfo?.name}@${result?.serverInfo?.version}`);
    return result;
  }

  _write(msg) {
    if (!this.proc?.stdin?.writable) throw new Error('REA MCP stdin is not writable');
    this.proc.stdin.write(`${JSON.stringify(msg)}\n`);
  }

  _ingest(chunk) {
    this.buffer += chunk.toString();
    let idx;
    while ((idx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) continue;

      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        this.emit('log', `non-JSON line ignored: ${line.slice(0, 160)}`);
        continue;
      }

      if (msg.id === this.initId && this._resolveInit) {
        const ok = this._resolveInit;
        this._resolveInit = null;
        this._rejectInit = null;
        if (msg.error) this._rejectInit?.(new Error(msg.error.message));
        else ok(msg.result);
        continue;
      }

      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.code ?? 'mcp'}: ${msg.error.message}`));
        else resolve(msg.result);
      }
    }
  }

  _rejectAll(reason) {
    for (const [, entry] of this.pending) entry.reject(new Error(reason));
    this.pending.clear();
  }

  async request(method, params = {}, timeoutMs = CALL_TIMEOUT_MS) {
    await this.ensure();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      try {
        this._write({ jsonrpc: '2.0', id, method, params });
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  async listTools() {
    const { tools = [] } = await this.request('tools/list', {}, BOOT_TIMEOUT_MS);
    const shaped = tools.map((t) => ({
      name: t.name,
      title: t.title || t.name,
      description: t.description || '',
      surface: t.surface || SURFACE_MAP[t.name] || inferSurface(t.name),
      inputSchema: t.inputSchema || { type: 'object', properties: {} },
    }));
    this._tools = shaped;
    return shaped;
  }

  async callTool(name, args = {}) {
    return this.request('tools/call', { name, arguments: args });
  }

  async restart() {
    try {
      this.proc?.kill('SIGTERM');
    } catch {
      /* already gone */
    }
    this.proc = null;
    this.state = 'stopped';
    this._tools = null;
    this._rejectAll('restarted');
    return this.ensure();
  }
}