import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchDelivery,
  fetchDeliveryAttempts,
  fetchEndpoints,
  replayDelivery,
} from "../api/hooklab.js";
import type { DeliveryAttempt, WebhookDelivery } from "@hooklab/shared";
import { StatusBadge } from "../components/StatusBadge.js";
import { ApiError } from "../api/client.js";

export function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [delivery, setDelivery] = useState<WebhookDelivery | null>(null);
  const [attempts, setAttempts] = useState<DeliveryAttempt[]>([]);
  const [endpointUrl, setEndpointUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = async (deliveryId: string) => {
    const [dlv, atts, eps] = await Promise.all([
      fetchDelivery(deliveryId),
      fetchDeliveryAttempts(deliveryId),
      fetchEndpoints(),
    ]);
    setDelivery(dlv);
    setAttempts(atts);
    setEndpointUrl(eps.find((e) => e.id === dlv.endpointId)?.url ?? null);
  };

  useEffect(() => {
    if (!id) return;
    void reload(id);
  }, [id]);

  async function onReplay() {
    if (!delivery) return;
    try {
      await replayDelivery(delivery.id);
      setMessage("Replay accepted — delivery re-queued.");
      await reload(delivery.id);
    } catch (err) {
      setMessage(
        err instanceof ApiError ? err.message : "Replay failed",
      );
    }
  }

  if (!delivery) {
    return <p className="text-slate-400">Loading…</p>;
  }

  const canReplay =
    delivery.status === "failed" || delivery.status === "dead_lettered";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/deliveries" className="text-sm text-sky-400 hover:underline">
            ← Deliveries
          </Link>
          <h2 className="mt-2 font-mono text-xl text-white">{delivery.id}</h2>
          <p className="text-sm text-slate-400">
            Event{" "}
            <Link to={`/events/${delivery.eventId}`} className="text-sky-400">
              {delivery.eventId}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={delivery.status} />
          {canReplay && (
            <button
              type="button"
              onClick={() => void onReplay()}
              className="rounded bg-amber-700 px-3 py-1.5 text-sm text-white hover:bg-amber-600"
            >
              Replay
            </button>
          )}
        </div>
      </div>

      {message && (
        <p className="text-sm text-slate-300">{message}</p>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <InfoCard title="Destination" value={endpointUrl ?? delivery.endpointId} />
        <InfoCard title="Attempts" value={String(delivery.attemptCount)} />
        <InfoCard
          title="Last HTTP status"
          value={delivery.responseStatus?.toString() ?? "—"}
        />
        <InfoCard title="Next retry" value={delivery.nextRetryAt ?? "—"} />
      </section>

      {delivery.errorMessage && (
        <section>
          <h3 className="text-sm font-medium text-red-300">Error</h3>
          <p className="mt-1 text-sm text-slate-300">{delivery.errorMessage}</p>
        </section>
      )}

      {delivery.responseBody && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-slate-300">
            Last response body
          </h3>
          <pre className="overflow-auto rounded border border-slate-800 bg-slate-950 p-3 text-xs">
            {delivery.responseBody}
          </pre>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-sm font-medium text-slate-300">Attempt history</h3>
        <motionAttempts attempts={attempts} />
      </section>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <p className="text-xs uppercase text-slate-500">{title}</p>
      <p className="mt-1 break-all text-sm text-slate-200">{value}</p>
    </div>
  );
}

function motionAttempts({ attempts }: { attempts: DeliveryAttempt[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">HTTP</th>
            <th className="px-4 py-2">Duration</th>
            <th className="px-4 py-2">Error</th>
            <th className="px-4 py-2">Response snippet</th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((a) => (
            <tr key={a.id} className="border-t border-slate-800">
              <td className="px-4 py-2 text-slate-300">{a.attemptNumber}</td>
              <td className="px-4 py-2">{a.responseStatus ?? "—"}</td>
              <td className="px-4 py-2 text-slate-400">
                {a.durationMs != null ? `${a.durationMs} ms` : "—"}
              </td>
              <td className="max-w-xs truncate px-4 py-2 text-red-300">
                {a.errorMessage ?? "—"}
              </td>
              <td className="max-w-md truncate px-4 py-2 font-mono text-xs text-slate-500">
                {a.responseBody ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
