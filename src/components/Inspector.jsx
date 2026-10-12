import React from 'react';
import ArgForm from './ArgForm.jsx';
import AskPanel from './AskPanel.jsx';
import { familyColor } from '../lib/surfaces.js';

function EmptyInspector() {
  return (
    <div className="empty">
      <div className="empty-title">NO TOOL LOADED</div>
      <p className="empty-body">
        Pick a cartridge from the grid to see what it does and run it. Start with{' '}
        <code style={{ color: 'var(--accent)' }}>open_binary</code> once a target is set.
      </p>
    </div>
  );
}

export default function Inspector({
  tool,
  args,
  setArgs,
  onRun,
  running,
  result,
  runError,
  settings,
  hasKey,
}) {
  if (!tool) {
    return (
      <aside className="inspector">
        <EmptyInspector />
      </aside>
    );
  }

  const canRun = !running;

  return (
    <aside className="inspector">
      <div className="insp-head">
        <h2 className="insp-name">{tool.name}</h2>
        <span className="insp-fam">
          <span className="filter-swatch" style={{ background: familyColor(tool.surface) }} />
          {tool.surface}
        </span>
        {tool.description && <p className="insp-desc">{tool.description}</p>}
      </div>

      <div className="insp-body">
        <ArgForm tool={tool} values={args} onChange={setArgs} />

        {runError && (
          <div className="notice bad" style={{ marginTop: 12 }}>
            {runError}
          </div>
        )}

        {result && (
          <div style={{ marginTop: 16 }}>
            <div className="result-head">
              <span className="result-title">RESULT</span>
              <span className="result-meta">{result.durationMs} ms</span>
            </div>
            <pre className={`code${result.isError ? ' error' : ''}`}>
              {result.text || JSON.stringify(result.structured, null, 2) || '(no output)'}
            </pre>

            <div style={{ marginTop: 16 }}>
              <AskPanel
                toolName={result.tool}
                output={result.text || JSON.stringify(result.structured, null, 2)}
                settings={settings}
                hasKey={hasKey}
              />
            </div>
          </div>
        )}
      </div>

      <div className="insp-foot">
        <button className="btn btn-primary" onClick={onRun} disabled={!canRun}>
          {running ? 'running…' : `run ${tool.name}`}
        </button>
      </div>
    </aside>
  );
}