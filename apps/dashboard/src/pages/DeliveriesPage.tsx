import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDeliveries, fetchEndpoints } from "../api/hooklab.js";
import type { WebhookDelivery } from "@hooklab/shared";
import { StatusBadge } from "../components/StatusBadge.js";
import { ApiError } from "../api/client.js";

export function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [endpointUrls, setEndpointUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [dlv, eps] = await Promise.all([
          fetchDeliveries(),
          fetchEndpoints(),
        ]);
        setDeliveries(dlv);
        setEndpointUrls(Object.fromEntries(eps.map((e) => [e.id, e.url])));
        setError(null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load");
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-white">Deliveries</h2>
        <p className="text-sm text-slate-400">
          Fan-out rows from published events to each matching endpoint.
        </p>
      </header>
      {error && (
        <div className="rounded border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-2">Delivery</th>
              <th className="px-4 py-2">Endpoint</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Attempts</th>
              <th className="px-4 py-2">HTTP</th>
              <th className="px-4 py-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id} className="border-t border-slate-800">
                <td className="px-4 py-2">
                  <Link
                    to={`/deliveries/${d.id}`}
                    className="font-mono text-sky-400 hover:underline"
                  >
                    {d.id}
                  </Link>
                </td>
                <td className="max-w-xs truncate px-4 py-2 text-slate-300">
                  {endpointUrls[d.endpointId] ?? d.endpointId}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={d.status} />
                </td>
                <td className="px-4 py-2 text-slate-300">{d.attemptCount}</td>
                <td className="px-4 py-2 text-slate-300">
                  {d.responseStatus ?? "—"}
                </td>
                <td className="max-w-xs truncate px-4 py-2 text-red-300">
                  {d.errorMessage ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
