import { FormEvent, useEffect, useState } from "react";
import {
  createEndpoint,
  deleteEndpoint,
  fetchEndpoints,
  updateEndpoint,
  type PublicEndpoint,
} from "../api/hooklab.js";
import { ApiError } from "../api/client.js";

export function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<PublicEndpoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("http://127.0.0.1:4000/webhooks");
  const [events, setEvents] = useState("task.completed");
  const [description, setDescription] = useState("Local consumer");
  const [oneTimeSecret, setOneTimeSecret] = useState<string | null>(null);

  const reload = async () => {
    try {
      setEndpoints(await fetchEndpoints());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load endpoints");
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      const created = await createEndpoint({
        url,
        description: description || undefined,
        subscribedEvents: events
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setOneTimeSecret(created.signingSecret);
      await reload();
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed");
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold text-white">Endpoints</h2>
        <p className="text-sm text-slate-400">
          Register subscriber URLs and event subscriptions. Signing secrets are never listed again
          after creation.
        </p>
      </header>

      {error && (
        <div className="rounded border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {oneTimeSecret && (
        <div className="rounded border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm">
          <p className="font-medium text-amber-100">Copy signing secret now (shown once):</p>
          <code className="mt-2 block break-all font-mono text-amber-50">
            {oneTimeSecret}
          </code>
          <button
            type="button"
            className="mt-2 text-xs text-amber-300 underline"
            onClick={() => setOneTimeSecret(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <form
        onSubmit={onCreate}
        className="grid gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-2"
      >
        <label className="text-sm text-slate-300 md:col-span-2">
          URL
          <input
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </label>
        <label className="text-sm text-slate-300">
          Subscribed events (comma-separated)
          <input
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={events}
            onChange={(e) => setEvents(e.target.value)}
            required
          />
        </label>
        <label className="text-sm text-slate-300">
          Description
          <input
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="md:col-span-2 rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Create endpoint
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-2">URL</th>
              <th className="px-4 py-2">Events</th>
              <th className="px-4 py-2">Enabled</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep) => (
              <tr key={ep.id} className="border-t border-slate-800">
                <td className="px-4 py-2">
                  <div className="font-mono text-xs text-slate-500">{ep.id}</div>
                  <div className="text-slate-200">{ep.url}</div>
                </td>
                <td className="px-4 py-2 text-slate-300">
                  {ep.subscribedEvents.join(", ")}
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    className={`rounded px-2 py-1 text-xs ${
                      ep.enabled
                        ? "bg-emerald-900 text-emerald-100"
                        : "bg-slate-800 text-slate-400"
                    }`}
                    onClick={async () => {
                      await updateEndpoint(ep.id, { enabled: !ep.enabled });
                      await reload();
                    }}
                  >
                    {ep.enabled ? "enabled" : "disabled"}
                  </button>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    className="text-xs text-red-400 hover:underline"
                    onClick={async () => {
                      if (!confirm(`Delete ${ep.id}?`)) return;
                      await deleteEndpoint(ep.id);
                      await reload();
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
