import ollama from "ollama";

import { buildDiaryReplyPrompt, buildTopicSuggestionPrompt } from "@/lib/prompts";
import { parseJsonObject, truncate } from "@/lib/utils";

const MODEL = "qwen2.5:7b";

async function runPrompt(prompt: string): Promise<string> {
  const response = await ollama.chat({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a safe assistant in a university research prototype. Keep responses brief and neutral.",
      },
      { role: "user", content: prompt },
    ],
    options: {
      temperature: 0.4,
      num_predict: 180,
    },
  });

  return response.message.content.trim();
}

export async function generateDiaryReply(
  mood: string,
  diaryText: string,
  personaStyle?: string
): Promise<string> {
  try {
    const prompt = buildDiaryReplyPrompt({ mood, diaryText, personaStyle });
    const raw = await runPrompt(prompt);
    return truncate(raw || "Thanks for sharing that. I am here with you.", 420);
  } catch (error) {
    console.error("generateDiaryReply failed:", error);
    return "Thanks for sharing this entry. I hear you, and we can keep the conversation gentle and simple.";
  }
}

export async function generateTopicSuggestion(
  diaryText: string
): Promise<{ topic: string; reason: string }> {
  try {
    const prompt = buildTopicSuggestionPrompt(diaryText);
    const raw = await runPrompt(prompt);
    const parsed = parseJsonObject<{ topic?: string; reason?: string }>(raw);

    if (parsed?.topic && parsed?.reason) {
      return {
        topic: truncate(parsed.topic, 90),
        reason: truncate(parsed.reason, 180),
      };
    }

    return {
      topic: "A small next step for tomorrow",
      reason:
        "This was suggested because your diary mentioned planning, effort, and what comes next.",
    };
  } catch (error) {
    console.error("generateTopicSuggestion failed:", error);
    return {
      topic: "A small next step for tomorrow",
      reason:
        "This fallback topic is shown because suggestion generation was temporarily unavailable.",
    };
  }
}
