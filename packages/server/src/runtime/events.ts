import { eventBus, EVENT } from "../../../core/event-bus.ts";

export function enableDevelopmentEventLogging() {
  if (process.env.NODE_ENV === "production") return;

  for (const event of Object.values(EVENT)) {
    eventBus.on(event, (payload) => {
      console.log(`[EventBus] ${event}`, JSON.stringify(payload, null, 2));
    });
  }
}
