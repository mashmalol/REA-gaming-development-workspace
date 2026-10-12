async function json(res) {
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`bridge returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(body.error || `request failed (${res.status})`);
  return body;
}

export async function getHealth() {
  const body = await json(await fetch('/api/health'));
  // Flatten the bridge envelope so callers see the REA status fields directly.
  return { reachable: true, ...(body.rea ?? {}) };
}

export async function getTools({ refresh = false } = {}) {
  const q = refresh ? '?refresh=1' : '';
  return json(await fetch(`/api/tools${q}`));
}

export async function callTool(name, args) {
  const res = await fetch('/api/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, arguments: args ?? {} }),
  });
  const body = await json(res);
  return body;
}

export async function restartBridge() {
  return json(await fetch('/api/restart', { method: 'POST' }));
}

/** Flatten an MCP tool result into plain text plus any structured payload. */
export function unwrapResult(result) {
  if (!result) return { text: '', structured: null, isError: false };
  const content = Array.isArray(result.content) ? result.content : [];
  const text = content
    .filter((c) => c?.type === 'text')
    .map((c) => c.text)
    .join('\n');
  return {
    text,
    structured: result.structuredContent ?? null,
    isError: Boolean(result.isError),
  };
}