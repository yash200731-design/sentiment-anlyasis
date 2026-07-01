/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Key, Save, Trash2, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function SettingsPanel() {
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setGeminiKey(localStorage.getItem("sentix_gemini_api_key") || "");
    setOpenaiKey(localStorage.getItem("sentix_openai_api_key") || "");
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("sentix_gemini_api_key", geminiKey.trim());
    localStorage.setItem("sentix_openai_api_key", openaiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClear = () => {
    localStorage.removeItem("sentix_gemini_api_key");
    localStorage.removeItem("sentix_openai_api_key");
    setGeminiKey("");
    setOpenaiKey("");
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div id="settings-tab-panel" className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h4 className="text-base font-bold font-sans text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-1">
          <Key className="w-5 h-5 text-indigo-500" />
          <span>API Key Settings (Secrets)</span>
        </h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-6 font-sans">
          Configure your personal API keys to unlock real-time Gemini/OpenAI strategic insights. Keys are saved securely in your browser's local storage.
        </p>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Gemini API Key
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-slate-800 dark:text-slate-100 font-mono"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Used for executive summary briefings and suggestions.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              OpenAI API Key (Alternative)
            </label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-proj-..."
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-slate-800 dark:text-slate-100 font-mono"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              If configured, the app will utilize GPT-4o-mini as an alternative backend.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/60 dark:border-slate-800/80 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-sans">
              <strong>Security Notice:</strong> Your keys are never saved on our databases. They are sent directly to the local backend's serverless proxy endpoints only during execution requests.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white transition active:scale-99 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-500/10"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={!geminiKey && !openaiKey}
              className="p-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/40 rounded-xl text-slate-400 hover:text-rose-500 transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              aria-label="Remove stored keys"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </form>

        {saved && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in font-sans">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>API Settings updated successfully!</span>
          </div>
        )}
      </div>
    </div>
  );
}
