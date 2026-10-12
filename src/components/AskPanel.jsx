import React, { useState } from 'react';
import { askAboutOutput } from '../lib/ai.js';

export default function AskPanel({ toolName, output, settings, hasKey }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!question.trim() || busy) return;
    setBusy(true);
    setError('');
    setAnswer('');
    try {
      const res = await askAboutOutput({ settings, tool: toolName, output, question });
      setAnswer(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="result-head">
        <span className="result-title">ASK ABOUT THIS</span>
        <span className="result-meta">{settings.provider}</span>
      </div>

      {!hasKey && settings.provider !== 'ollama' && (
        <div className="notice">No API key stored. Open “keys” in the top bar to add one.</div>
      )}

      <label className="field">
        <span className="sr-only">Question about the result</span>
        <textarea
          className="textarea"
          value={question}
          placeholder="What does this suggest about the save format? Which function writes it?"
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
        />
      </label>

      <button className="btn btn-primary" type="submit" disabled={busy || !question.trim()}>
        {busy ? 'thinking…' : 'ask'}
      </button>

      {error && (
        <div className="notice bad" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}
      {answer && <pre className="code" style={{ marginTop: 10 }}>{answer}</pre>}
    </form>
  );
}