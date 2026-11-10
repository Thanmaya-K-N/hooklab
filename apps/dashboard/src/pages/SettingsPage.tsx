import { useState } from "react";
import { getStoredApiKey, setStoredApiKey } from "../api/client.js";

export function SettingsPage() {
  const [key, setKey] = useState(getStoredApiKey);
  const [saved, setSaved] = useState(false);

  return (
    <div className="max-w-lg space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-white">Settings</h2>
        <p className="text-sm text-slate-400">
          The dashboard stores your HookLab API key only in this browser (
          <code className="text-slate-300">localStorage</code>). Secrets from endpoint
          registration are shown once in the Endpoints UI — they are not stored here.
        </p>
      </header>

      <form
        className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setStoredApiKey(key);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }}
      >
        <label className="block text-sm text-slate-300">
          API key
          <input
            type="password"
            autoComplete="off"
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
            placeholder="hl_live_…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </label>
        <p className="text-xs text-slate-500">
          Run <code className="text-slate-400">npm run db:seed</code> if you need a dev key.
        </p>
        <button
          type="submit"
          className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Save
        </button>
        {saved && (
          <span className="ml-3 text-sm text-emerald-400">Saved.</span>
        )}
      </form>
    </div>
  );
}
