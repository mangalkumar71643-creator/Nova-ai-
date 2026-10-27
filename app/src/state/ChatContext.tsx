import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiMessage, streamChat } from '../api/chat';
import { keepImage } from '../media/images';
import type { ChatImage, Conversation, Message } from '../types';
import { useSettings } from './SettingsContext';

const STORAGE_KEY = 'nova-ai/conversations';
const TITLE_LENGTH = 40;
const DEFAULT_IMAGE_PROMPT = 'Is photo ke baare me batao.';

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function makeTitle(text: string) {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > TITLE_LENGTH ? `${oneLine.slice(0, TITLE_LENGTH)}…` : oneLine;
}

// Photos are only sent while their base64 is in memory (this app session).
// After a restart the model just sees that a photo was there.
function toApiMessage(m: Message): ApiMessage {
  if (!m.image) return { role: m.role, content: m.content };
  if (m.image.base64) {
    return { role: m.role, content: m.content, images: [`data:image/jpeg;base64,${m.image.base64}`] };
  }
  return { role: m.role, content: `[Photo]\n${m.content}` };
}

// Base64 photos would quickly fill AsyncStorage, so they are left out when saving.
function withoutBase64(conversations: Conversation[]) {
  return conversations.map((c) => ({
    ...c,
    messages: c.messages.map((m) =>
      m.image?.base64 ? { ...m, image: { ...m.image, base64: undefined } } : m,
    ),
  }));
}

interface ChatContextValue {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  /** Id of the conversation currently receiving a reply, if any. */
  streamingId: string | null;
  /** Photo attached in the composer, waiting to be sent. */
  draftImage: ChatImage | null;
  setDraftImage: (image: ChatImage | null) => void;
  sendMessage: (text: string) => void;
  stopGenerating: () => void;
  startNewChat: () => void;
  openConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  deleteAllConversations: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [draftImage, setDraftImage] = useState<ChatImage | null>(null);
  const [loaded, setLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setConversations(JSON.parse(raw)))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // While a reply streams, save at most every 500ms instead of on every token;
  // otherwise save right away so nothing is lost if the app is closed.
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(
      () => {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(withoutBase64(conversations))).catch(() => {});
      },
      streamingId ? 500 : 0,
    );
    return () => clearTimeout(timer);
  }, [conversations, loaded, streamingId]);

  const updateMessage = useCallback(
    (conversationId: string, messageId: string, update: (m: Message) => Partial<Message>) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...update(m) } : m)),
              }
            : c,
        ),
      );
    },
    [],
  );

  const sendMessage = useCallback(
    (text: string) => {
      const image = draftImage;
      const content = text.trim() || (image ? DEFAULT_IMAGE_PROMPT : '');
      if (!content || streamingId) return;

      const existing = conversations.find((c) => c.id === activeId);
      const conversationId = existing?.id ?? newId();
      const now = Date.now();
      const userMessage: Message = {
        id: newId(),
        role: 'user',
        content,
        createdAt: now,
        image: image ?? undefined,
      };
      const reply: Message = { id: newId(), role: 'assistant', content: '', createdAt: now };
      const history = [...(existing?.messages ?? []), userMessage]
        .filter((m) => !m.error && m.content)
        .map(toApiMessage);

      setConversations((prev) => {
        const conversation: Conversation = existing
          ? { ...existing, messages: [...existing.messages, userMessage, reply], updatedAt: now }
          : { id: conversationId, title: makeTitle(content), messages: [userMessage, reply], updatedAt: now };
        return [conversation, ...prev.filter((c) => c.id !== conversationId)];
      });
      setActiveId(conversationId);
      setStreamingId(conversationId);
      setDraftImage(null);

      if (image) {
        keepImage(image.uri)
          .then((uri) =>
            updateMessage(conversationId, userMessage.id, (m) => ({ image: { ...m.image!, uri } })),
          )
          .catch(() => {});
      }

      const controller = new AbortController();
      abortRef.current = controller;

      streamChat({
        settings,
        messages: history,
        signal: controller.signal,
        onDelta: (delta) => updateMessage(conversationId, reply.id, (m) => ({ content: m.content + delta })),
      })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          const message = err instanceof Error ? err.message : String(err);
          updateMessage(conversationId, reply.id, () => ({
            error: `${message}\n\nCheck that the server is running and the Server URL in Settings is correct.`,
          }));
        })
        .finally(() => {
          abortRef.current = null;
          setStreamingId(null);
        });
    },
    [activeId, conversations, draftImage, settings, streamingId, updateMessage],
  );

  const stopGenerating = useCallback(() => abortRef.current?.abort(), []);

  const startNewChat = useCallback(() => setActiveId(null), []);

  const openConversation = useCallback((id: string) => setActiveId(id), []);

  const deleteConversation = useCallback(
    (id: string) => {
      if (id === streamingId) abortRef.current?.abort();
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setActiveId((current) => (current === id ? null : current));
    },
    [streamingId],
  );

  const deleteAllConversations = useCallback(() => {
    abortRef.current?.abort();
    setConversations([]);
    setActiveId(null);
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({
      conversations,
      activeConversation: conversations.find((c) => c.id === activeId) ?? null,
      streamingId,
      draftImage,
      setDraftImage,
      sendMessage,
      stopGenerating,
      startNewChat,
      openConversation,
      deleteConversation,
      deleteAllConversations,
    }),
    [
      conversations,
      activeId,
      streamingId,
      draftImage,
      sendMessage,
      stopGenerating,
      startNewChat,
      openConversation,
      deleteConversation,
      deleteAllConversations,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}
