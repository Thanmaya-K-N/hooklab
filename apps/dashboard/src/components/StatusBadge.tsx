import type { DeliveryStatus } from "@hooklab/shared";

const styles: Record<DeliveryStatus, string> = {
  pending: "bg-slate-700 text-slate-200",
  processing: "bg-blue-900 text-blue-100",
  succeeded: "bg-emerald-900 text-emerald-100",
  retrying: "bg-amber-900 text-amber-100",
  failed: "bg-red-900 text-red-100",
  dead_lettered: "bg-rose-950 text-rose-100",
};

export function StatusBadge({ status }: { status: DeliveryStatus | string }) {
  const key = status as DeliveryStatus;
  const className = styles[key] ?? "bg-slate-800 text-slate-200";
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${className}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
