"use client";

import type { AppSettings, ReplyTimingPreference } from "@/lib/types";

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
}

const timingOptions: Array<{ id: ReplyTimingPreference; label: string }> = [
  { id: "instant", label: "Instant" },
  { id: "short-pause", label: "Short pause" },
  { id: "manual", label: "Manual trigger" },
];

export default function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const updateTiming = (replyTimingPreference: ReplyTimingPreference) => {
    onChange({
      ...settings,
      replyTimingPreference,
    });
  };

  return (
    <section className="card space-y-4 p-4 md:p-5">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={settings.consentToReuse}
            onChange={(event) =>
              onChange({
                ...settings,
                consentToReuse: event.target.checked,
              })
            }
            className="mt-1 h-4 w-4"
          />
          <span className="text-sm text-slate-800">
            Allow diary content to be used by AI to generate new conversation topics
          </span>
        </label>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-800">Reply timing preference (visual)</p>
        <div className="flex flex-wrap gap-2">
          {timingOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => updateTiming(option.id)}
              className={`btn ${
                settings.replyTimingPreference === option.id
                  ? "btn-primary"
                  : "btn-secondary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          This preference is currently UI-only for prototype realism.
        </p>
      </div>
    </section>
  );
}
