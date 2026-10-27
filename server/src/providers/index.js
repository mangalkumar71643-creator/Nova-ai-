import { streamMock } from './mock.js';
import { streamOpenAI } from './openai.js';

const providers = {
  mock: streamMock,
  openai: streamOpenAI,
  // Your own model, served by model/serve.py (it speaks the OpenAI API too).
  nova: (options) =>
    streamOpenAI({
      ...options,
      config: { ...options.config, openaiBaseUrl: options.config.novaModelUrl, openaiApiKey: '' },
    }),
};

export function getProvider(name) {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown PROVIDER "${name}". Use one of: ${Object.keys(providers).join(', ')}`);
  }
  return provider;
}
