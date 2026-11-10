import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchEvents } from "../api/hooklab.js";
import { ApiError } from "../api/client.js";
import type { HookLabEvent } from "@hooklab/shared";

export function EventsPage() {
  const [events, setEvents] = useState<HookLabEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setEvents(await fetchEvents());
        setError(null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load events");
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-white">Events</h2>
        <p className="text-sm text-slate-400">Persisted events accepted by the API.</p>
      </header>
      {error && (
        <div className="rounded border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      <motionTable events={events} />
    </div>
  );
}

function motionTable({ events }: { events: HookLabEvent[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            <th className="px-4 py-2">ID</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-slate-500">
                No events yet.
              </td>
            </tr>
          ) : (
            events.map((evt) => (
              <tr key={evt.id} className="border-t border-slate-800">
                <td className="px-4 py-2">
                  <Link
                    to={`/events/${evt.id}`}
                    className="font-mono text-sky-400 hover:underline"
                  >
                    {evt.id}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-200">{evt.eventType}</td>
                <td className="px-4 py-2 text-slate-400">{evt.createdAt}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
