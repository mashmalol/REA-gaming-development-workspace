import React, { useState } from 'react';
import { PROVIDERS, maskKey } from '../lib/settings.js';

export default function SettingsDialog({ settings, onSave, onClose }) {
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);

  const provider = PROVIDERS[draft.provider] ?? PROVIDERS.openai;

  const pickProvider = (id) => {
    const next = PROVIDERS[id];
    setDraft((d) => ({ ...d, provider: id, baseUrl: next.defaultBaseUrl, model: next.defaultModel }));
  };

  const save = (e) => {
    e.preventDefault();
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="backdrop" onClick={onClose} role="presentation">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-head">
          <h2 className="dialog-title" id="settings-title">
            AI KEYS
          </h2>
          <div className="topbar-spacer" />
          <button className="btn btn-sm" onClick={onClose} aria-label="Close">
            close
          </button>
        </div>

        <form onSubmit={save}>
          <div className="dialog-body">
            <label className="field">
              <span className="field-label">Provider</span>
              <select
                className="select"
                value={draft.provider}
                onChange={(e) => pickProvider(e.target.value)}
              >
                {Object.values(PROVIDERS).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <p className="field-hint">{provider.hint}</p>

            <label className="field">
              <span className="field-label">Model</span>
              <input
                className="input"
                value={draft.model}
                onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
                spellCheck="false"
              />
            </label>

            <label className="field">
              <span className="field-label">Base URL</span>
              <input
                className="input"
                value={draft.baseUrl}
                onChange={(e) => setDraft((d) => ({ ...d, baseUrl: e.target.value }))}
                spellCheck="false"
              />
            </label>

            <label className="field">
              <span className="field-label">API key</span>
              <input
                className="input"
                type="password"
                autoComplete="off"
                value={draft.apiKey}
                placeholder={provider.keyless ? 'not needed' : 'paste your key'}
                onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
              />
              {draft.apiKey && <span className="field-hint">stored as {maskKey(draft.apiKey)}</span>}
            </label>

            <div className="notice">
              Saved to this browser's localStorage, unencrypted. Any script on this origin can read
              it. This tool is meant to run locally — do not deploy it with a real key in it.
            </div>
          </div>

          <div className="dialog-foot">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setDraft((d) => ({ ...d, apiKey: '' }))}
            >
              clear key
            </button>
            <button type="submit" className="btn btn-primary">
              {saved ? 'saved' : 'save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}