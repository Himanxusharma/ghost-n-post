import { auth } from "@clerk/nextjs/server";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  jobs,
  posts,
  publicationMetrics,
  publications,
  videos,
} from "@/db/schema";
import { events, inngest } from "@/inngest/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Sign in required" },
        },
        { status: 401 },
      );
    }

    const db = getDb();

    const [generationStats] = await db
      .select({
        totalJobs: count(),
        completedJobs: sql<number>`count(*) filter (where ${jobs.status} = 'complete')::int`,
        failedJobs: sql<number>`count(*) filter (where ${jobs.status} = 'failed')::int`,
      })
      .from(jobs)
      .where(eq(jobs.userId, userId));

    const [publishStats] = await db
      .select({
        totalPublishes: count(),
        published: sql<number>`count(*) filter (where ${publications.status} = 'published')::int`,
        scheduled: sql<number>`count(*) filter (where ${publications.status} = 'scheduled')::int`,
        failed: sql<number>`count(*) filter (where ${publications.status} = 'failed')::int`,
      })
      .from(publications)
      .where(eq(publications.userId, userId));

    const recent = await db
      .select({
        publicationId: publications.id,
        platform: publications.platform,
        status: publications.status,
        externalUrl: publications.externalUrl,
        publishedAt: publications.publishedAt,
        contentSnippet: publications.content,
        videoTitle: videos.title,
        likes: publicationMetrics.likes,
        comments: publicationMetrics.comments,
        shares: publicationMetrics.shares,
        impressions: publicationMetrics.impressions,
        views: publicationMetrics.views,
        metricsFetchedAt: publicationMetrics.fetchedAt,
      })
      .from(publications)
      .leftJoin(posts, eq(publications.postId, posts.id))
      .leftJoin(videos, eq(posts.videoId, videos.id))
      .leftJoin(
        publicationMetrics,
        eq(publicationMetrics.publicationId, publications.id),
      )
      .where(
        and(
          eq(publications.userId, userId),
          eq(publications.status, "published"),
        ),
      )
      .orderBy(desc(publications.publishedAt))
      .limit(25);

    const totals = recent.reduce(
      (acc, row) => {
        acc.likes += row.likes ?? 0;
        acc.comments += row.comments ?? 0;
        acc.shares += row.shares ?? 0;
        acc.impressions += row.impressions ?? 0;
        return acc;
      },
      { likes: 0, comments: 0, shares: 0, impressions: 0 },
    );

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          generations: generationStats?.totalJobs ?? 0,
          completedGenerations: generationStats?.completedJobs ?? 0,
          failedGenerations: generationStats?.failedJobs ?? 0,
          publishes: publishStats?.totalPublishes ?? 0,
          published: publishStats?.published ?? 0,
          scheduled: publishStats?.scheduled ?? 0,
          failedPublishes: publishStats?.failed ?? 0,
          engagement: totals,
        },
        publications: recent.map((row) => ({
          id: row.publicationId,
          platform: row.platform,
          status: row.status,
          externalUrl: row.externalUrl,
          publishedAt: row.publishedAt,
          videoTitle: row.videoTitle,
          snippet: row.contentSnippet.slice(0, 140),
          metrics: {
            likes: row.likes ?? 0,
            comments: row.comments ?? 0,
            shares: row.shares ?? 0,
            impressions: row.impressions ?? 0,
            views: row.views ?? 0,
            fetchedAt: row.metricsFetchedAt,
          },
        })),
      },
    });
  } catch (error) {
    console.error("[GET /api/analytics]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to load analytics" },
      },
      { status: 500 },
    );
  }
}

/** Trigger a metrics sync for the current user's published posts. */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Sign in required" },
        },
        { status: 401 },
      );
    }

    await inngest.send({
      name: events.analyticsSyncRequested,
      data: { userId },
    });

    return NextResponse.json({
      success: true,
      data: { queued: true },
    });
  } catch (error) {
    console.error("[POST /api/analytics]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to queue sync" },
      },
      { status: 500 },
    );
  }
}
