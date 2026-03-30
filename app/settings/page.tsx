"use client";

import Link from "next/link";
import { useState } from "react";

import SettingsPanel from "@/components/SettingsPanel";
import {
  defaultSettings,
  loadSettingsFromLocalStorage,
  saveSettingsToLocalStorage,
} from "@/lib/storage";
import type { AppSettings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window === "undefined") {
      return defaultSettings;
    }
    return loadSettingsFromLocalStorage();
  });

  const handleSettingsChange = (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    saveSettingsToLocalStorage(nextSettings);
    // TODO: Add analytics hook for settings changes in study sessions.
  };

  return (
    <main className="prototype-shell flex-1 space-y-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Study settings</h1>
        <p className="text-sm text-slate-600">
          Manage consent and basic prototype behavior controls.
        </p>
      </header>

      <SettingsPanel settings={settings} onChange={handleSettingsChange} />

      <Link href="/" className="inline-flex text-sm font-medium text-blue-700 hover:underline">
        Back to diary prototype
      </Link>
    </main>
  );
}
