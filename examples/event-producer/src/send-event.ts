import { createSampleEvent } from "./event.js";
import { publishToHookLabApi } from "./hooklab-api.js";
import { publishEvent } from "./publish.js";

const hooklabApi = process.env.HOOKLAB_API_URL;
const webhookUrl = process.env.WEBHOOK_URL ?? "http://127.0.0.1:4000/webhooks";
const eventType = process.env.EVENT_TYPE ?? "task.completed";
const data = {
  taskId: "task_demo_123",
  status: "completed",
};

try {
  if (hooklabApi) {
    const apiKey = process.env.HOOKLAB_API_KEY;
    if (!apiKey) {
      console.error("HOOKLAB_API_KEY is required when HOOKLAB_API_URL is set");
      process.exitCode = 1;
    } else {
      console.log("Publishing via HookLab API:", hooklabApi);
      console.log("Event type:", eventType);
      const result = await publishToHookLabApi({
        apiBaseUrl: hooklabApi,
        apiKey,
        type: eventType,
        data,
      });
      console.log("\nResponse status:", result.statusCode);
      console.log("Response body:", result.body);
      if (result.statusCode !== 202) {
        process.exitCode = 1;
      }
    }
  } else {
    const event = createSampleEvent(eventType, data);
    console.log("Publishing event to:", webhookUrl);
    console.log("Payload:", JSON.stringify(event, null, 2));
    const result = await publishEvent({ webhookUrl, event });
    console.log("\nResponse status:", result.statusCode);
    console.log("Response body:", result.body);
    if (result.statusCode >= 400) {
      process.exitCode = 1;
    }
  }
} catch (err) {
  console.error("\nRequest failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
