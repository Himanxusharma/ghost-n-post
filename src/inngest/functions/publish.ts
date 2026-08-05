import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { publications } from "@/db/schema";
import { events, inngest } from "@/inngest/client";
import { executePublication } from "@/lib/social/publish";

/** Immediate publish job. */
export const publishNow = inngest.createFunction(
  {
    id: "social-publish-now",
    triggers: [{ event: events.publishRequested }],
    retries: 2,
  },
  async ({ event, step }) => {
    const { publicationId } = event.data as { publicationId: string };
    return step.run("publish", async () => executePublication(publicationId));
  },
);

/**
 * Scheduled publish — sleeps until the target time, then publishes
 * (unless the row was cancelled meanwhile).
 */
export const publishScheduled = inngest.createFunction(
  {
    id: "social-publish-scheduled",
    triggers: [{ event: events.publishScheduled }],
    retries: 2,
  },
  async ({ event, step }) => {
    const { publicationId, scheduledFor } = event.data as {
      publicationId: string;
      scheduledFor: string;
    };

    await step.sleepUntil("wait-until-schedule", new Date(scheduledFor));

    const stillActive = await step.run("check-not-cancelled", async () => {
      const db = getDb();
      const row = await db.query.publications.findFirst({
        where: eq(publications.id, publicationId),
      });
      return row?.status === "scheduled" || row?.status === "pending";
    });

    if (!stillActive) {
      return { skipped: true, publicationId };
    }

    return step.run("publish", async () => executePublication(publicationId));
  },
);
