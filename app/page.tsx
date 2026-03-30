"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import ChatWindow from "@/components/ChatWindow";
import DiaryEntryForm from "@/components/DiaryEntryForm";
import PersonaSelector from "@/components/PersonaSelector";
import TopicSuggestionCard from "@/components/TopicSuggestionCard";
import { mockScenarios } from "@/data/mock-scenarios";
import { personas } from "@/data/personas";
import {
  appendChatMessage,
  defaultSettings,
  loadSettingsFromLocalStorage,
  saveDiaryEntry,
  saveSettingsToLocalStorage,
  setLatestTopicSuggestion,
} from "@/lib/storage";
import type { AppSettings, ChatMessage, TopicSuggestion } from "@/lib/types";
import { makeId } from "@/lib/utils";

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window === "undefined") {
      return defaultSettings;
    }
    return loadSettingsFromLocalStorage();
  });
  const [isReplyLoading, setIsReplyLoading] = useState(false);
  const [isTopicLoading, setIsTopicLoading] = useState(false);
  const [latestDiaryText, setLatestDiaryText] = useState("");
  const [topicSuggestion, setTopicSuggestion] = useState<TopicSuggestion | null>(null);

  const selectedPersona = useMemo(
    () =>
      personas.find((persona) => persona.id === settings.selectedPersonaId) ?? personas[0],
    [settings.selectedPersonaId]
  );

  const updateSettings = (next: AppSettings) => {
    setSettings(next);
    saveSettingsToLocalStorage(next);
  };

  const pushMessage = (message: ChatMessage) => {
    setMessages((current) => [...current, message]);
    appendChatMessage(message);
  };

  const requestTopicSuggestion = async (diaryText: string) => {
    setIsTopicLoading(true);
    try {
      const response = await fetch("/api/topic-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diaryText,
          consentToReuse: settings.consentToReuse,
        }),
      });
      const data = (await response.json()) as TopicSuggestion;
      if (!response.ok || !data.topic) {
        setTopicSuggestion(null);
        setLatestTopicSuggestion(null);
        return;
      }
      setTopicSuggestion(data);
      setLatestTopicSuggestion(data);
    } finally {
      setIsTopicLoading(false);
    }
  };

  const handleDiarySubmit = async ({
    mood,
    diaryText,
  }: {
    mood: string;
    diaryText: string;
  }) => {
    setLatestDiaryText(diaryText);
    setTopicSuggestion(null);
    setLatestTopicSuggestion(null);
    setIsReplyLoading(true);

    const diaryMessage: ChatMessage = {
      id: makeId("msg"),
      role: "user",
      content: diaryText,
      createdAt: new Date().toISOString(),
    };
    pushMessage(diaryMessage);

    saveDiaryEntry({
      id: makeId("entry"),
      mood,
      diaryText,
      createdAt: new Date().toISOString(),
      consentToReuse: settings.consentToReuse,
    });

    try {
      const response = await fetch("/api/diary-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood,
          diaryText,
          personaId: selectedPersona.id,
        }),
      });
      const data = (await response.json()) as { replyText?: string };
      const content =
        data.replyText ?? "Thanks for your entry. I am here and ready to continue.";

      pushMessage({
        id: makeId("msg"),
        role: "assistant",
        content,
        createdAt: new Date().toISOString(),
      });
    } catch {
      pushMessage({
        id: makeId("msg"),
        role: "system",
        content: "We could not generate an AI reply just now. Please try again.",
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsReplyLoading(false);
    }
  };

  const handleContinueTopic = () => {
    if (!topicSuggestion) {
      return;
    }
    pushMessage({
      id: makeId("msg"),
      role: "assistant",
      content: `Sure. We can continue with this topic: ${topicSuggestion.topic}`,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <main className="prototype-shell flex-1 space-y-4 py-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Diary-based conversational AI prototype
            </h1>
            <p className="text-sm text-slate-600">
              Focus: diary-to-dialogue flow, consent-aware topic generation, and transparent
              user control.
            </p>
          </div>
          <Link href="/settings" className="btn btn-secondary">
            Open settings
          </Link>
        </div>

        <p className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600">
          Consent status:{" "}
          <span
            className={
              settings.consentToReuse ? "font-semibold text-green-700" : "font-semibold text-red-700"
            }
          >
            {settings.consentToReuse
              ? "Enabled (topics can be suggested)"
              : "Disabled (no topic suggestions)"}
          </span>
        </p>
      </header>

      <section className="card p-4 md:p-5">
        <PersonaSelector
          personas={personas}
          selectedPersonaId={settings.selectedPersonaId}
          onChange={(selectedPersonaId) => updateSettings({ ...settings, selectedPersonaId })}
        />
      </section>

      <DiaryEntryForm
        onSubmit={handleDiarySubmit}
        isSubmitting={isReplyLoading}
        sampleEntries={mockScenarios}
      />

      <ChatWindow messages={messages} />

      {settings.consentToReuse && latestDiaryText ? (
        <section className="space-y-3">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700">Topic suggestion controls</h3>
            <p className="mt-1 text-sm text-slate-600">
              You can generate, dismiss, or regenerate a suggested next topic from diary content.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => requestTopicSuggestion(latestDiaryText)}
                disabled={isTopicLoading}
              >
                {isTopicLoading ? "Generating topic..." : "Generate topic suggestion"}
              </button>
              {topicSuggestion ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setTopicSuggestion(null);
                    setLatestTopicSuggestion(null);
                  }}
                >
                  Clear suggestion
                </button>
              ) : null}
            </div>
          </div>

          {topicSuggestion ? (
            <TopicSuggestionCard
              suggestion={topicSuggestion}
              isLoading={isTopicLoading}
              onContinue={handleContinueTopic}
              onDismiss={() => {
                setTopicSuggestion(null);
                setLatestTopicSuggestion(null);
                pushMessage({
                  id: makeId("msg"),
                  role: "system",
                  content: "Topic suggestion dismissed by user.",
                  createdAt: new Date().toISOString(),
                });
              }}
              onRegenerate={() => requestTopicSuggestion(latestDiaryText)}
            />
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
