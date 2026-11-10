import { randomUUID } from "node:crypto";

export type SampleEvent = {
  id: string;
  type: string;
  createdAt: string;
  data: Record<string, unknown>;
};

export function createSampleEvent(
  type: string,
  data: Record<string, unknown>,
  id?: string,
): SampleEvent {
  return {
    id: id ?? `evt_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    type,
    createdAt: new Date().toISOString(),
    data,
  };
}
