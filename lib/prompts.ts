import { truncate } from "@/lib/utils";

interface DiaryReplyPromptArgs {
  mood: string;
  diaryText: string;
  personaStyle?: string;
}

export function buildDiaryReplyPrompt({
  mood,
  diaryText,
  personaStyle,
}: DiaryReplyPromptArgs): string {
  return [
    "You are a supportive conversational companion for a university diary prototype.",
    "Write one brief reply (2-4 sentences).",
    "Be warm and respectful. Avoid intrusive questions.",
    "Do not provide medical, therapeutic, diagnostic, or crisis advice.",
    `Preferred style: ${personaStyle ?? "warm and balanced"}.`,
    `Mood tag from user: ${mood}.`,
    `Diary entry: """${truncate(diaryText, 1400)}"""`,
  ].join("\n");
}

export function buildTopicSuggestionPrompt(diaryText: string): string {
  return [
    "You generate an optional next conversation topic from a diary entry.",
    "Output JSON only with keys: topic, reason.",
    "topic: 4-10 words, natural and optional in tone.",
    "reason: exactly one sentence explaining the link to diary content.",
    "Keep both concise and non-intrusive.",
    "Do not use therapy, diagnosis, crisis, or medical language.",
    `Diary entry: """${truncate(diaryText, 1400)}"""`,
  ].join("\n");
}
