export type Role = 'user' | 'assistant';

export interface ChatImage {
  uri: string;
  width: number;
  height: number;
  /** JPEG data sent to the model. Kept in memory only, never written to storage. */
  base64?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  image?: ChatImage;
  /** Set when the reply failed; such messages are not sent back to the model. */
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export type VoiceLanguage = 'hi-IN' | 'en-IN';

export interface Settings {
  serverUrl: string;
  apiToken: string;
  systemPrompt: string;
  voiceLanguage: VoiceLanguage;
}
