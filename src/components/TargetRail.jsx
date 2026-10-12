import React from 'react';
import { LEGEND } from '../lib/surfaces.js';

export default function TargetRail({
  targetPath,
  onTargetPathChange,
  onOpen,
  opening,
  session,
  result,
  error,
  providerLabel,
  hasKey,
}) {
  return (
    <aside className="rail">
      <div className="rail-section">
        <h2 className="rail-title">TARGET</h2>
        <label className="field">
          <span className="field-label">Artifact path</span>
          <input
            className="input"
            value={targetPath}
            placeholder="/path/to/game.exe or app.asar"
            onChange={(e) => onTargetPathChange(e.target.value)}
            spellCheck="false"
          />
        </label>
        <button className="btn btn-primary" onClick={onOpen} disabled={opening || !targetPath.trim()}>
          {opening ? 'opening…' : 'open binary'}
        </button>
        {error && (
          <div className="notice bad" style={{ marginTop: 10 }}>
            {error}
          </div>
        )}
        {result && !error && (
          <div className="field-hint" style={{ marginTop: 8 }}>
            {result}
          </div>
        )}
      </div>

      <div className="rail-section">
        <h2 className="rail-title">SESSION</h2>
        <div className="kv">
          <span className="kv-k">document</span>
          <span className="kv-v">{session?.document || '—'}</span>
        </div>
        <div className="kv">
          <span className="kv-k">address</span>
          <span className="kv-v">{session?.address || '—'}</span>
        </div>
        <div className="kv">
          <span className="kv-k">procedure</span>
          <span className="kv-v">{session?.procedure || '—'}</span>
        </div>
      </div>

      <div className="rail-section">
        <h2 className="rail-title">ASSISTANT</h2>
        <div className="kv">
          <span className="kv-k">provider</span>
          <span className="kv-v">{providerLabel}</span>
        </div>
        <div className="kv">
          <span className="kv-k">key</span>
          <span className="kv-v">{hasKey ? 'stored' : 'not set'}</span>
        </div>
        <p className="field-hint" style={{ marginTop: 8 }}>
          Keys live in this browser's localStorage. They are readable by any script running on this
          origin.
        </p>
      </div>

      <div className="rail-section">
        <h2 className="rail-title">FAMILIES</h2>
        <div className="filters" style={{ marginBottom: 0 }}>
          {LEGEND.map((item) => (
            <span key={item.label} className="filter" style={{ cursor: 'default' }}>
              <span className="filter-swatch" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}