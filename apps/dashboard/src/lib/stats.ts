export type DeliveryStatusCounts = Record<string, number>;

export function computeSuccessRate(byStatus: DeliveryStatusCounts): number | null {
  const succeeded = byStatus.succeeded ?? 0;
  const failed = (byStatus.failed ?? 0) + (byStatus.dead_lettered ?? 0);
  const terminal = succeeded + failed;
  if (terminal === 0) return null;
  return Math.round((succeeded / terminal) * 1000) / 10;
}
