import type {
  AppSettings,
  ChatMessage,
  DiaryEntry,
  TopicSuggestion,
} from "@/lib/types";

const SETTINGS_KEY = "diary-prototype-settings";

export const defaultSettings: AppSettings = {
  consentToReuse: false,
  replyTimingPreference: "instant",
  selectedPersonaId: "warm-gentle",
};

const memory = {
  diaryEntries: [] as DiaryEntry[],
  chatMessages: [] as ChatMessage[],
  latestTopicSuggestion: null as TopicSuggestion | null,
};

export function saveDiaryEntry(entry: DiaryEntry): DiaryEntry {
  memory.diaryEntries.push(entry);
  // TODO: Persist to a database for longitudinal study sessions.
  return entry;
}

export function listDiaryEntries(): DiaryEntry[] {
  return [...memory.diaryEntries];
}

export function appendChatMessage(message: ChatMessage): ChatMessage {
  memory.chatMessages.push(message);
  // TODO: Add event logging for message-level analytics.
  return message;
}

export function listChatMessages(): ChatMessage[] {
  return [...memory.chatMessages];
}

export function setLatestTopicSuggestion(topic: TopicSuggestion | null): void {
  memory.latestTopicSuggestion = topic;
}

export function getLatestTopicSuggestion(): TopicSuggestion | null {
  return memory.latestTopicSuggestion;
}

export function loadSettingsFromLocalStorage(): AppSettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return defaultSettings;
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...defaultSettings,
      ...parsed,
    };
  } catch {
    return defaultSettings;
  }
}

export function saveSettingsToLocalStorage(settings: AppSettings): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
