import React from 'react';

/**
 * REA's schemas use JSON Schema indirection: `detail: { $ref: "#/$defs/__schema7" }`.
 * The real `type` / `enum` / `default` live in `$defs`, so every field must be
 * resolved before it can drive the form control.
 */
function resolveSpec(schema, spec, depth = 0) {
  if (!spec || typeof spec !== 'object' || depth > 6) return spec ?? {};
  if (typeof spec.$ref !== 'string') return spec;

  const ref = spec.$ref;
  let target = null;
  if (ref.startsWith('#/$defs/')) target = schema.$defs?.[ref.slice('#/$defs/'.length)];
  else if (ref === '#') target = schema;

  if (!target || typeof target !== 'object') return spec;
  const { $ref, ...own } = spec;
  return resolveSpec(schema, { ...target, ...own }, depth + 1);
}

function coerce(spec, raw) {
  if (raw === '' || raw === undefined) return undefined;
  if (spec?.type === 'number' || spec?.type === 'integer') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }
  if (spec?.type === 'boolean') return raw === 'true' || raw === true;
  if (spec?.type === 'array') {
    const parts = String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length ? parts : undefined;
  }
  return String(raw);
}

export default function ArgForm({ tool, values, onChange }) {
  const schema = tool?.inputSchema ?? {};
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const entries = Object.entries(properties);

  const set = (name, spec, raw) => {
    const next = { ...values };
    const v = coerce(spec, raw);
    if (v === undefined) delete next[name];
    else next[name] = v;
    onChange(next);
  };

  if (entries.length === 0) {
    return (
      <p className="field-hint">
        {tool?.name} takes no arguments.
      </p>
    );
  }

  return (
    <>
      {entries.map(([name, rawSpec]) => {
        const spec = resolveSpec(schema, rawSpec);
        const value = values[name];
        const isRequired = required.has(name);
        const shown = value === undefined || value === null ? '' : Array.isArray(value) ? value.join(', ') : String(value);

        return (
          <label className="field" key={name}>
            <span className="field-label">
              {name}
              {isRequired && <span style={{ color: 'var(--t8)' }}> *</span>}
            </span>

            {Array.isArray(spec?.enum) ? (
              <select className="select" value={shown} onChange={(e) => set(name, spec, e.target.value)}>
                <option value="">—</option>
                {spec.enum.map((opt) => (
                  <option key={String(opt)} value={String(opt)}>
                    {String(opt)}
                  </option>
                ))}
              </select>
            ) : spec?.type === 'boolean' ? (
              <select className="select" value={shown} onChange={(e) => set(name, spec, e.target.value)}>
                <option value="">—</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                className="input"
                type={spec?.type === 'number' || spec?.type === 'integer' ? 'number' : 'text'}
                value={shown}
                placeholder={spec?.default !== undefined ? String(spec.default) : ''}
                onChange={(e) => set(name, spec, e.target.value)}
                spellCheck="false"
              />
            )}

            {spec?.description && <span className="field-hint">{spec.description}</span>}
          </label>
        );
      })}

      <p className="field-hint">Leave a field blank to omit it from the call.</p>
    </>
  );
}