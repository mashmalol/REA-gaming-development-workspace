import React, { useCallback, useEffect, useState } from 'react';
import Topbar from './components/Topbar.jsx';
import TargetRail from './components/TargetRail.jsx';
import ToolGrid from './components/ToolGrid.jsx';
import Inspector from './components/Inspector.jsx';
import SettingsDialog from './components/SettingsDialog.jsx';
import { getHealth, getTools, callTool, restartBridge, unwrapResult } from './lib/api.js';
import { loadSettings, saveSettings, PROVIDERS } from './lib/settings.js';

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [health, setHealth] = useState(null);
  const [tools, setTools] = useState([]);
  const [toolsError, setToolsError] = useState('');

  const [selected, setSelected] = useState(null);
  const [args, setArgs] = useState({});
  const [result, setResult] = useState(null);
  const [runError, setRunError] = useState('');
  const [running, setRunning] = useState(false);

  const [targetPath, setTargetPath] = useState('');
  const [opening, setOpening] = useState(false);
  const [openNote, setOpenNote] = useState('');
  const [openError, setOpenError] = useState('');
  const [session, setSession] = useState(null);

  /* ---- bridge health ---- */
  const refreshHealth = useCallback(async () => {
    try {
      setHealth(await getHealth());
    } catch {
      setHealth({ reachable: false, state: 'error', lastError: 'bridge unreachable' });
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { tools: list } = await getTools();
        if (alive) {
          setTools(list);
          setToolsError('');
        }
      } catch (err) {
        if (alive) setToolsError(err.message);
      }
    })();

    refreshHealth();
    const timer = setInterval(refreshHealth, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [refreshHealth]);

  /* ---- running tools ---- */
  const runTool = useCallback(async (name, toolArgs) => {
    setRunning(true);
    setRunError('');
    try {
      const res = await callTool(name, toolArgs ?? {});
      if (!res.ok) throw new Error(res.error || 'call failed');
      setResult({ tool: name, durationMs: res.durationMs, ...unwrapResult(res.result) });
    } catch (err) {
      setRunError(err.message);
      setResult(null);
    } finally {
      setRunning(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await callTool('get_navigation_context', {});
      if (res.ok && !unwrapResult(res.result).isError) {
        setSession(unwrapResult(res.result).structured);
      }
    } catch {
      /* session context is advisory only */
    }
  }, []);

  const openBinary = async () => {
    const path = targetPath.trim();
    if (!path) return;
    setOpening(true);
    setOpenError('');
    setOpenNote('');
    try {
      const res = await callTool('open_binary', { path });
      if (!res.ok) throw new Error(res.error || 'call failed');
      const unwrapped = unwrapResult(res.result);
      if (unwrapped.isError) throw new Error(unwrapped.text || 'open_binary reported an error');
      setOpenNote(`Opened. ${unwrapped.text.slice(0, 160)}`);
      refreshSession();
    } catch (err) {
      setOpenError(err.message);
    } finally {
      setOpening(false);
    }
  };

  const selectTool = (tool) => {
    setSelected(tool);
    setArgs({});
    setResult(null);
    setRunError('');
  };

  const provider = PROVIDERS[settings.provider] ?? PROVIDERS.openai;
  const hasKey = Boolean(settings.apiKey) || provider.keyless === true;

  return (
    <div className="app">
      <Topbar
        health={health}
        toolCount={tools.length || null}
        onOpenSettings={() => setSettingsOpen(true)}
        onRestart={async () => {
          try {
            await restartBridge();
            const { tools: list } = await getTools({ refresh: true });
            setTools(list);
          } finally {
            refreshHealth();
          }
        }}
      />

      <div className="layout">
        <TargetRail
          targetPath={targetPath}
          onTargetPathChange={setTargetPath}
          onOpen={openBinary}
          opening={opening}
          session={session}
          result={openNote}
          error={openError}
          providerLabel={provider.label}
          hasKey={hasKey}
        />

        <main className="stage">
          {toolsError ? (
            <div className="notice bad">{toolsError}</div>
          ) : tools.length === 0 ? (
            <div className="empty">
              <div className="empty-title">LOADING CARTRIDGE</div>
              <p className="empty-body">Fetching the REA tool catalog from the bridge…</p>
            </div>
          ) : (
            <ToolGrid tools={tools} selectedName={selected?.name} onSelect={selectTool} />
          )}
        </main>

        <Inspector
          tool={selected}
          args={args}
          setArgs={setArgs}
          onRun={() => runTool(selected.name, args)}
          running={running}
          result={result}
          runError={runError}
          settings={settings}
          hasKey={hasKey}
        />
      </div>

      {settingsOpen && (
        <SettingsDialog
          settings={settings}
          onSave={(next) => setSettings(saveSettings(next))}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}