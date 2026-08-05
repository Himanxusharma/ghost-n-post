import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  publicationMetrics,
  publications,
} from "@/db/schema";
import { events, inngest } from "@/inngest/client";
import { getValidXAccount } from "@/lib/social/x";

type MetricsSnapshot = {
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  views: number;
  raw: Record<string, unknown>;
};

async function fetchXMetrics(
  userId: string,
  tweetId: string,
): Promise<MetricsSnapshot | null> {
  try {
    const account = await getValidXAccount(userId);
    const response = await fetch(
      `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${account.accessToken}` } },
    );
    const json = (await response.json()) as {
      data?: {
        public_metrics?: {
          like_count?: number;
          reply_count?: number;
          retweet_count?: number;
          quote_count?: number;
          impression_count?: number;
        };
      };
    };
    if (!response.ok || !json.data?.public_metrics) {
      return null;
    }
    const m = json.data.public_metrics;
    return {
      likes: m.like_count ?? 0,
      comments: m.reply_count ?? 0,
      shares: (m.retweet_count ?? 0) + (m.quote_count ?? 0),
      impressions: m.impression_count ?? 0,
      views: m.impression_count ?? 0,
      raw: m as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

/**
 * LinkedIn member social analytics are heavily restricted. We store a
 * best-effort placeholder and keep the row so the dashboard stays coherent.
 */
async function fetchLinkedInMetricsPlaceholder(): Promise<MetricsSnapshot> {
  return {
    likes: 0,
    comments: 0,
    shares: 0,
    impressions: 0,
    views: 0,
    raw: { note: "LinkedIn member analytics require partner APIs" },
  };
}

export async function syncPublicationMetrics(publicationId: string) {
  const db = getDb();
  const publication = await db.query.publications.findFirst({
    where: eq(publications.id, publicationId),
  });
  if (!publication || publication.status !== "published") {
    return null;
  }
  if (!publication.externalPostId) {
    return null;
  }

  let snapshot: MetricsSnapshot | null = null;
  if (publication.platform === "x") {
    snapshot = await fetchXMetrics(
      publication.userId,
      publication.externalPostId,
    );
  } else {
    snapshot = await fetchLinkedInMetricsPlaceholder();
  }

  if (!snapshot) {
    return null;
  }

  const [row] = await db
    .insert(publicationMetrics)
    .values({
      publicationId,
      ...snapshot,
      fetchedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: publicationMetrics.publicationId,
      set: {
        ...snapshot,
        fetchedAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning();

  return row;
}

export const syncAnalytics = inngest.createFunction(
  {
    id: "sync-publication-analytics",
    triggers: [
      { event: events.analyticsSyncRequested },
      { cron: "0 * * * *" }, // hourly
    ],
    retries: 1,
  },
  async ({ event, step }) => {
    const userId = (event.data as { userId?: string } | undefined)?.userId;

    const ids = await step.run("list-published", async () => {
      const db = getDb();
      const rows = await db.query.publications.findMany({
        where: userId
          ? and(
              eq(publications.userId, userId),
              eq(publications.status, "published"),
            )
          : eq(publications.status, "published"),
        limit: 50,
      });
      return rows.map((row) => row.id);
    });

    let synced = 0;
    for (const publicationId of ids) {
      const result = await step.run(`sync-${publicationId}`, async () =>
        syncPublicationMetrics(publicationId),
      );
      if (result) synced += 1;
    }

    return { synced, total: ids.length };
  },
);
