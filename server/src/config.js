const DEFAULT_SYSTEM_PROMPT =
  'You are Nova AI, a helpful, friendly assistant. Reply in the same language the user writes in (Hindi, Hinglish or English).';

export function loadConfig(env = process.env) {
  const provider = (env.PROVIDER || 'mock').toLowerCase();
  return {
    port: Number(env.PORT) || 8787,
    provider,
    openaiBaseUrl: (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    openaiApiKey: env.OPENAI_API_KEY || '',
    // Address of model/serve.py, used when PROVIDER=nova.
    novaModelUrl: (env.NOVA_MODEL_URL || 'http://localhost:8000/v1').replace(/\/+$/, ''),
    model: env.MODEL || (provider === 'nova' ? 'nova' : 'gpt-4o-mini'),
    systemPrompt: env.SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT,
    apiToken: env.API_TOKEN || '',
    saveChats: env.SAVE_CHATS === '1',
    dataDir: env.DATA_DIR || new URL('../data/', import.meta.url).pathname,
  };
}
