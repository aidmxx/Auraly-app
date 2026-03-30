"use client";

import { useMemo, useState } from "react";

import type { DiaryEntry } from "@/lib/types";

interface DiaryEntryFormProps {
  onSubmit: (payload: { mood: string; diaryText: string }) => Promise<void>;
  isSubmitting: boolean;
  sampleEntries: Array<Pick<DiaryEntry, "mood" | "diaryText">>;
}

export default function DiaryEntryForm({
  onSubmit,
  isSubmitting,
  sampleEntries,
}: DiaryEntryFormProps) {
  const [mood, setMood] = useState("neutral");
  const [diaryText, setDiaryText] = useState("");

  const canSubmit = useMemo(
    () => !isSubmitting && diaryText.trim().length >= 10,
    [diaryText, isSubmitting]
  );

  const fillScenario = (index: number) => {
    const scenario = sampleEntries[index];
    if (!scenario) {
      return;
    }
    setMood(scenario.mood);
    setDiaryText(scenario.diaryText);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    await onSubmit({ mood, diaryText: diaryText.trim() });
    setDiaryText("");
  };

  return (
    <section className="card p-4 md:p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Diary entry</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label htmlFor="mood" className="mb-1 block text-sm font-medium text-slate-800">
              Mood
            </label>
            <select
              id="mood"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={mood}
              onChange={(event) => setMood(event.target.value)}
            >
              <option value="neutral">Neutral</option>
              <option value="happy">Happy</option>
              <option value="relieved">Relieved</option>
              <option value="stressed">Stressed</option>
              <option value="upset">Upset</option>
              <option value="tired">Tired</option>
              <option value="anxious">Anxious</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="diaryText"
              className="mb-1 block text-sm font-medium text-slate-800"
            >
              Today&apos;s entry
            </label>
            <textarea
              id="diaryText"
              className="h-28 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={diaryText}
              onChange={(event) => setDiaryText(event.target.value)}
              placeholder="Write a short diary reflection..."
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {isSubmitting ? "Generating reply..." : "Submit diary entry"}
          </button>
          {sampleEntries.map((scenario, index) => (
            <button
              key={`${scenario.mood}-${index}`}
              type="button"
              className="btn btn-secondary text-xs"
              onClick={() => fillScenario(index)}
            >
              Use sample {index + 1}
            </button>
          ))}
        </div>
      </form>
    </section>
  );
}
