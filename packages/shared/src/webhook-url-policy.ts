export type WebhookUrlPolicy = {
  /** When true, http://127.0.0.1 and private literals may be used (dev only). */
  allowLocalhost: boolean;
};

export function getWebhookUrlPolicyFromEnv(): WebhookUrlPolicy {
  return {
    allowLocalhost: process.env.WEBHOOK_ALLOW_LOCALHOST === "1",
  };
}
