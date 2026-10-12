import { PROVIDERS } from './settings.js';

const MAX_CONTEXT_CHARS = 12000;

function clip(text, max = MAX_CONTEXT_CHARS) {
  const s = String(text ?? '');
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n\n[truncated — ${s.length - max} more characters]`;
}

function systemPrompt() {
  return [
    'You are assisting a game developer who is reverse engineering a game artifact with REA.',
    'You receive raw tool output and a question about it.',
    'Answer concretely: name the functions, offsets, strings, symbols and engine formats involved.',
    'Be explicit when the evidence does not support a conclusion rather than guessing.',
    'Keep answers tight. Use short paragraphs or bullet lists. No preamble.',
  ].join(' ');
}

async function postOpenAiCompatible({ baseUrl, model, apiKey, context, question }) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: `Tool: ${context.tool}\n\nOutput:\n${context.output}\n\nQuestion: ${question}` },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${(await res.text()).slice(0, 300)}`);
  }
  const body = await res.json();
  return body?.choices?.[0]?.message?.content ?? '(empty response)';
}

async function postAnthropic({ baseUrl, model, apiKey, context, question }) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system: systemPrompt(),
      messages: [
        {
          role: 'user',
          content: `Tool: ${context.tool}\n\nOutput:\n${clip(context.output)}\n\nQuestion: ${question}`,
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${(await res.text()).slice(0, 300)}`);
  }
  const body = await res.json();
  const text = (body?.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  return text || '(empty response)';
}

export async function askAboutOutput({ settings, tool, output, question }) {
  const provider = PROVIDERS[settings.provider];
  if (!provider) throw new Error(`Unknown provider "${settings.provider}".`);
  if (!settings.model?.trim()) throw new Error('No model set. Open settings and pick a model.');

  if (provider.keyless !== true && !settings.apiKey?.trim()) {
    throw new Error(`${provider.label} needs an API key. Open settings to add one.`);
  }

  const payload = {
    baseUrl: settings.baseUrl || provider.defaultBaseUrl,
    model: settings.model,
    apiKey: settings.apiKey,
    context: { tool, output: clip(output) },
    question: question.trim(),
  };

  return settings.provider === 'anthropic' ? postAnthropic(payload) : postOpenAiCompatible(payload);
}