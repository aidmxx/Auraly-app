export type MessageRole = "user" | "assistant" | "system";

export interface DiaryEntry {
  id: string;
  mood: string;
  diaryText: string;
  createdAt: string;
  consentToReuse: boolean;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface TopicSuggestion {
  topic: string;
  reason: string;
}

export interface Persona {
  id: string;
  name: string;
  shortDescription: string;
  replyStyle: string;
}

export type ReplyTimingPreference = "instant" | "short-pause" | "manual";

export interface AppSettings {
  consentToReuse: boolean;
  replyTimingPreference: ReplyTimingPreference;
  selectedPersonaId: string;
}
