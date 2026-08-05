import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "ghost-n-post",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

export const events = {
  generateRequested: "video/generate.requested",
  publishRequested: "social/publish.requested",
  publishScheduled: "social/publish.scheduled",
  batchRequested: "batch/process.requested",
  analyticsSyncRequested: "analytics/sync.requested",
} as const;
