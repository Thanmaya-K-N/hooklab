export type HookLabPublishAck = {
  id: string;
  status: string;
  deliveriesCreated: number;
};

export async function publishToHookLabApi(options: {
  apiBaseUrl: string;
  apiKey: string;
  type: string;
  data: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<{ statusCode: number; body: HookLabPublishAck }> {
  const base = options.apiBaseUrl.replace(/\/$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);

  try {
    const response = await fetch(`${base}/api/v1/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({ type: options.type, data: options.data }),
      signal: controller.signal,
    });
    const body = (await response.json()) as HookLabPublishAck;
    return { statusCode: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}
