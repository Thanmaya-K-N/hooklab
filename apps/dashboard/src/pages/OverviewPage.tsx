import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  fetchDeliveries,
  fetchHealth,
  fetchMetrics,
  type MetricsResponse,
} from "../api/hooklab.js";
import { ApiError } from "../api/client.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { computeSuccessRate } from "../lib/stats.js";
import type { WebhookDelivery } from "@hooklab/shared";

export function OverviewPage() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [health, setHealth] = useState<{
    database: boolean;
    redis: boolean;
    status: string;
  } | null>(null);
  const [recent, setRecent] = useState<WebhookDelivery[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [h, m, deliveries] = await Promise.all([
          fetchHealth(),
          fetchMetrics(),
          fetchDeliveries(),
        ]);
        if (cancelled) return;
        setHealth({
          database: h.checks.database,
          redis: h.checks.redis,
          status: h.status,
        });
        setMetrics(m);
        setRecent(deliveries.slice(0, 8));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Failed to load overview (check API key in Settings)",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byStatus = metrics?.deliveries.byStatus ?? {};
  const successRate = computeSuccessRate(byStatus);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold text-white">Overview</h2>
        <p className="text-sm text-slate-400">
          Platform health, delivery outcomes, and recent activity.
        </p>
      </header>

      {error && (
        <div className="rounded border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Events published" value={metrics?.events.total ?? "—"} />
        <StatCard label="Succeeded" value={byStatus.succeeded ?? 0} />
        <StatCard
          label="Pending / in flight"
          value={
            (byStatus.pending ?? 0) +
            (byStatus.processing ?? 0) +
            (byStatus.retrying ?? 0)
          }
        />
        <StatCard
          label="Success rate (terminal)"
          value={successRate === null ? "—" : `${successRate}%`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <motionCard title="Infrastructure">
          <ul className="space-y-2 text-sm">
            <CheckRow label="PostgreSQL" ok={health?.database ?? false} />
            <CheckRow label="Redis" ok={health?.redis ?? false} />
            <li className="text-slate-400">
              API status:{" "}
              <span className="text-slate-200">{health?.status ?? "…"}</span>
            </li>
          </ul>
        </motionCard>
        <motionCard title="Queue (webhook-deliveries)">
          <ul className="space-y-2 text-sm text-slate-300">
            <li>Waiting: {metrics?.queue.waiting ?? "—"}</li>
            <li>Active: {metrics?.queue.active ?? "—"}</li>
            <li>Delayed: {metrics?.queue.delayed ?? "—"}</li>
            <li>Failed (BullMQ): {metrics?.queue.failed ?? "—"}</li>
          </ul>
        </motionCard>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
          Recent deliveries
        </h3>
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">ID</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Attempts</th>
                <th className="px-4 py-2 font-medium">HTTP</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-slate-500">
                    No deliveries yet. Publish an event after registering an endpoint.
                  </td>
                </tr>
              ) : (
                recent.map((d) => (
                  <tr key={d.id} className="border-t border-slate-800">
                    <td className="px-4 py-2">
                      <Link
                        to={`/deliveries/${d.id}`}
                        className="font-mono text-sky-400 hover:underline"
                      >
                        {d.id}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-2 text-slate-300">{d.attemptCount}</td>
                    <td className="px-4 py-2 text-slate-300">
                      {d.responseStatus ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function motionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <h3 className="mb-3 text-sm font-medium text-white">{title}</h3>
      {children}
    </div>
  );
}

function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span>{label}</span>
      <span className={ok ? "text-emerald-400" : "text-amber-400"}>
        {ok ? "ok" : "down"}
      </span>
    </li>
  );
}
