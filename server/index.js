import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ReaMcpClient, REA_VERSION } from './rea-mcp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8787);

const rea = new ReaMcpClient();
const logs = [];
rea.on('log', (line) => {
  logs.push({ at: new Date().toISOString(), line });
  if (logs.length > 200) logs.shift();
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, bridge: 'rea-arcade', rea: rea.status() });
});

app.get('/api/tools', async (req, res) => {
  try {
    const cached = rea.cachedTools();
    if (cached && req.query.refresh !== '1') return res.json({ tools: cached, cached: true });
    const tools = await rea.listTools();
    res.json({ tools, cached: false });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post('/api/call', async (req, res) => {
  const { name, arguments: args } = req.body ?? {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'A tool name is required.' });
  }
  try {
    const startedAt = Date.now();
    const result = await rea.callTool(name, args ?? {});
    res.json({ ok: true, name, durationMs: Date.now() - startedAt, result });
  } catch (err) {
    res.status(502).json({ ok: false, name, error: err.message });
  }
});

app.post('/api/restart', async (_req, res) => {
  try {
    await rea.restart();
    res.json({ ok: true, rea: rea.status() });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.get('/api/logs', (_req, res) => res.json({ logs }));

// Serve the built UI when it exists, so `node server/index.js` is enough in production.
const dist = path.join(ROOT, 'dist');
app.use(express.static(dist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(dist, 'index.html'), (err) => err && next());
});

app.listen(PORT, () => {
  console.log(`[rea-arcade] bridge  http://localhost:${PORT}`);
  console.log(`[rea-arcade] target  rea-agents@${REA_VERSION} mcp (stdio)`);
});