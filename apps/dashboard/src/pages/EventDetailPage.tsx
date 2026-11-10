import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchDeliveries, fetchEvent } from "../api/hooklab.js";
import type { HookLabEvent, WebhookDelivery } from "@hooklab/shared";
import { StatusBadge } from "../components/StatusBadge.js";

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<HookLabEvent | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const [evt, dlv] = await Promise.all([
        fetchEvent(id),
        fetchDeliveries({ eventId: id }),
      ]);
      setEvent(evt);
      setDeliveries(dlv);
    })();
  }, [id]);

  if (!event) {
    return <p className="text-slate-400">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/events" className="text-sm text-sky-400 hover:underline">
          ← Events
        </Link>
        <h2 className="mt-2 font-mono text-xl text-white">{event.id}</h2>
        <p className="text-sm text-slate-400">{event.eventType}</p>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-medium text-slate-300">Payload</h3>
        <pre className="overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs text-slate-200">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium text-slate-300">
          Deliveries ({deliveries.length})
        </h3>
        <ul className="space-y-2">
          {deliveries.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded border border-slate-800 px-3 py-2 text-sm"
            >
              <Link to={`/deliveries/${d.id}`} className="font-mono text-sky-400">
                {d.id}
              </Link>
              <StatusBadge status={d.status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
