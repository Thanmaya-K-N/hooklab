export function getProcessingLeaseMs(): number {
  const value = Number(process.env.PROCESSING_LEASE_MS ?? "120000");
  return Number.isFinite(value) && value > 0 ? value : 120_000;
}

export function isProcessingLeaseExpired(
  updatedAt: Date,
  nowMs = Date.now(),
): boolean {
  return nowMs - updatedAt.getTime() >= getProcessingLeaseMs();
}
