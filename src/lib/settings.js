const KEY = 'rea-arcade.settings.v1';

export const PROVIDERS = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyless: false,
    hint: 'Needs a sk-… key. Sends the tool result and your question to OpenAI.',
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-5',
    keyless: false,
    hint: 'Needs an sk-ant-… key. Sends the tool result and your question to Anthropic.',
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama (local)',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1',
    keyless: true,
    hint: 'No key needed. Everything stays on this machine.',
  },
};

export const DEFAULTS = {
  provider: 'openai',
  baseUrl: PROVIDERS.openai.defaultBaseUrl,
  model: PROVIDERS.openai.defaultModel,
  apiKey: '',
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(next) {
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearKey() {
  const next = { ...loadSettings(), apiKey: '' };
  return saveSettings(next);
}

/** Show enough of a key to recognise it, never enough to use it. */
export function maskKey(key) {
  if (!key) return '';
  if (key.length <= 10) return '•'.repeat(key.length);
  return `${key.slice(0, 4)}${'•'.repeat(12)}${key.slice(-4)}`;
}