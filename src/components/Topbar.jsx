import React from 'react';

export default function Topbar({ health, toolCount, onOpenSettings, onRestart }) {
  const state = health?.reachable === false ? 'unreachable' : (health?.state ?? 'checking');

  // The MCP subprocess is spawned lazily on first call, so `stopped` means idle,
  // not broken. Only flag an error when the bridge itself reports one.
  const view = {
    checking: { dot: 'busy', label: 'checking bridge' },
    ready: { dot: 'live', label: 'mcp live' },
    starting: { dot: 'busy', label: 'mcp starting' },
    stopped: { dot: 'idle', label: 'mcp idle' },
    error: { dot: 'dead', label: 'mcp error' },
    unreachable: { dot: 'dead', label: 'bridge unreachable' },
  }[state] ?? { dot: 'dead', label: 'bridge unreachable' };

  return (
    <header className="topbar">
      <div className="brand">
        REA<span>//</span>ARCADE
      </div>

      <div className="status" role="status" aria-live="polite">
        <span className={`status-dot ${view.dot}`} />
        <span>{view.label}</span>
        <span className="status-text">rea-agents@{health?.version ?? '—'}</span>
        {toolCount != null && <span className="status-text">{toolCount} tools</span>}
      </div>

      <div className="topbar-spacer" />

      <button className="btn btn-sm" onClick={onRestart} title="Restart the REA MCP subprocess">
        restart bridge
      </button>
      <button className="btn btn-sm" onClick={onOpenSettings}>
        keys
      </button>
    </header>
  );
}