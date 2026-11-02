// Works with any server that speaks the OpenAI Chat Completions API:
// OpenAI, Ollama, vLLM, LM Studio, llama.cpp, TGI, Groq, Together...
// When you train your own model, serve it with one of these and point
// OPENAI_BASE_URL at it — nothing else in the app has to change.

import { parseSSE } from '../sse.js';

export async function* streamOpenAI({ messages, config, signal }) {
  const headers = { 'Content-Type': 'application/json' };
  if (config.openaiApiKey) headers.Authorization = `Bearer ${config.openaiApiKey}`;

  const res = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({ model: config.model, messages, stream: true }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => '');
    let detail = body;
    try {
      // OpenAI-style APIs send {error: {message}}; model/serve.py (FastAPI) sends {detail}.
      const json = JSON.parse(body);
      detail = json.error?.message ?? json.detail ?? body;
    } catch {}
    if (/image input is not supported|does not support image/i.test(String(detail))) {
      throw new Error('Yeh model abhi photo nahi dekh sakta. Photo ke bina sawal poochhiye.');
    }
    if (res.status === 503) {
      // A sleeping Hugging Face Space, or llama.cpp still loading the model.
      throw new Error('Nova abhi jaag raha hai. 1-2 minute baad dobara poochhiye.');
    }
    throw new Error(`Model API error ${res.status}: ${String(detail).slice(0, 300)}`);
  }

  for await (const data of parseSSE(res.body)) {
    if (data === '[DONE]') return;
    let json;
    try {
      json = JSON.parse(data);
    } catch {
      continue;
    }
    if (json.error) throw new Error(json.error.message ?? 'Model API error');
    const text = json.choices?.[0]?.delta?.content;
    if (text) yield text;
  }
}
