import { fetch } from 'expo/fetch';
import type { Role, Settings } from '../types';

type ServerEvent = { type: 'delta'; text: string } | { type: 'done' } | { type: 'error'; message: string };

export interface ApiMessage {
  role: Role;
  content: string;
  /** Photos as data URIs (data:image/jpeg;base64,...). */
  images?: string[];
}

interface StreamChatOptions {
  settings: Settings;
  messages: ApiMessage[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
}

const baseUrl = (url: string) => url.trim().replace(/\/+$/, '');

function authHeaders(settings: Settings): Record<string, string> {
  return settings.apiToken ? { Authorization: `Bearer ${settings.apiToken}` } : {};
}

// How long to wait for the server to start answering before giving up.
const CONNECT_TIMEOUT_MS = 30_000;

/** An error whose message is already written for the user (in Hinglish). */
export class ChatError extends Error {}

const CONNECTION_HELP =
  'Server se connect nahi ho paya. Internet chalu hai ya nahi dekhiye aur dobara koshish kijiye. ' +
  'Phir bhi na ho to Settings → Server connection me address check kijiye.';

/** Turns any failure from streamChat into a message the user can act on. */
export function friendlyError(err: unknown) {
  if (err instanceof ChatError) return err.message;
  const message = err instanceof Error ? err.message : String(err);
  return `${CONNECTION_HELP}\n\n(${message})`;
}

/** Sends the conversation to the server and calls onDelta as the reply streams in. */
export async function streamChat({ settings, messages, signal, onDelta }: StreamChatOptions) {
  // Abort if the caller stops, or if the server takes too long to respond at all.
  const controller = new AbortController();
  const stop = () => controller.abort();
  signal.addEventListener('abort', stop);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CONNECT_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${baseUrl(settings.serverUrl)}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...authHeaders(settings) },
      body: JSON.stringify({ messages, systemPrompt: settings.systemPrompt }),
      signal: controller.signal,
    });
  } catch (err) {
    if (timedOut)
      throw new ChatError('Server ne samay par jawab nahi diya. Thodi der baad dobara koshish kijiye.');
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok || !res.body) {
    signal.removeEventListener('abort', stop);
    if (res.status === 401)
      throw new ChatError('API token galat hai. Settings → Server connection me sahi token daaliye.');
    let message = `Server error ${res.status}`;
    try {
      message = (await res.json()).error ?? message;
    } catch {}
    throw new ChatError(`Server ne error diya: ${message}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const line = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);
        if (!line.startsWith('data:')) continue;

        const event = JSON.parse(line.slice(5)) as ServerEvent;
        if (event.type === 'delta') onDelta(event.text);
        else if (event.type === 'error') throw new ChatError(`Model me dikkat: ${event.message}`);
        else if (event.type === 'done') return;
      }
    }
  } finally {
    signal.removeEventListener('abort', stop);
  }
}

export async function checkHealth(settings: Settings) {
  const res = await fetch(`${baseUrl(settings.serverUrl)}/api/health`, {
    headers: authHeaders(settings),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return (await res.json()) as { ok: boolean; provider: string; model: string };
}
