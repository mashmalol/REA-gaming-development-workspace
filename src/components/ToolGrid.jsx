import React, { useMemo, useState } from 'react';
import { familyColor } from '../lib/surfaces.js';

export default function ToolGrid({ tools, selectedName, onSelect }) {
  const [query, setQuery] = useState('');
  const [activeFamilies, setActiveFamilies] = useState(() => new Set());

  const families = useMemo(() => {
    const counts = new Map();
    for (const t of tools) counts.set(t.surface, (counts.get(t.surface) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [tools]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((t) => {
      if (activeFamilies.size && !activeFamilies.has(t.surface)) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.title || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    });
  }, [tools, query, activeFamilies]);

  const toggleFamily = (surface) => {
    setActiveFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(surface)) next.delete(surface);
      else next.add(surface);
      return next;
    });
  };

  return (
    <>
      <label className="field">
        <span className="sr-only">Search tools</span>
        <input
          className="input"
          value={query}
          placeholder="Search 170 tools — strings, xrefs, decompile, adb…"
          onChange={(e) => setQuery(e.target.value)}
          spellCheck="false"
        />
      </label>

      <div className="filters">
        {families.map(([surface, count]) => {
          const on = activeFamilies.has(surface);
          return (
            <button
              key={surface}
              className="filter"
              aria-pressed={on}
              onClick={() => toggleFamily(surface)}
              title={`Toggle ${surface}`}
            >
              <span className="filter-swatch" style={{ background: familyColor(surface) }} />
              {surface}
              <span className="filter-count">{count}</span>
            </button>
          );
        })}
        {activeFamilies.size > 0 && (
          <button className="filter" onClick={() => setActiveFamilies(new Set())}>
            clear
          </button>
        )}
      </div>

      <div className="cart-grid" role="listbox" aria-label="REA tools">
        {visible.map((tool) => (
          <button
            key={tool.name}
            className="cart"
            role="option"
            aria-selected={tool.name === selectedName}
            style={{ '--fam': familyColor(tool.surface) }}
            onClick={() => onSelect(tool)}
            title={tool.description}
          >
            <span className="cart-name">{tool.name.split('_').join('_\u200B')}</span>
            <span className="cart-fam">{tool.surface}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="field-hint" style={{ marginTop: 12 }}>
          No tools match. Clear the search or pick another family.
        </p>
      )}
    </>
  );
}