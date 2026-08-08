import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { batches, jobs } from "@/db/schema";
import { events, inngest } from "@/inngest/client";
import { refreshBatchProgress } from "@/lib/batch/progress";
import { extractYoutubeId } from "@/lib/youtube-id";
import { listChannelVideos } from "@/lib/youtube";

/**
 * Resolve batch inputs into video URLs, create child jobs, and fan out
 * generate events with limited concurrency.
 */
export const processBatch = inngest.createFunction(
  {
    id: "process-batch",
    triggers: [{ event: events.batchRequested }],
    concurrency: [{ limit: 3 }],
    retries: 1,
  },
  async ({ event, step }) => {
    const { batchId } = event.data as { batchId: string };

    const resolved = await step.run("resolve-videos", async () => {
      const db = getDb();
      const batch = await db.query.batches.findFirst({
        where: eq(batches.id, batchId),
      });
      if (!batch) {
        throw new Error("Batch not found");
      }

      await db
        .update(batches)
        .set({
          status: "resolving",
          stageLabel: "Resolving videos…",
          updatedAt: new Date(),
        })
        .where(eq(batches.id, batchId));

      let videos: Array<{ youtubeId: string; title: string; url: string }> = [];
      let channelId: string | null = null;
      let channelTitle: string | null = null;

      try {
        if (batch.type === "channel") {
          const listed = await listChannelVideos(
            batch.sourceInput,
            batch.maxVideos,
          );
          videos = listed.videos;
          channelId = listed.channelId;
          channelTitle = listed.channelTitle;
        } else {
          const urls = batch.sourceInput
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          for (const url of urls.slice(0, batch.maxVideos)) {
            const youtubeId = extractYoutubeId(url);
            if (!youtubeId) continue;
            videos.push({
              youtubeId,
              title: youtubeId,
              url: `https://www.youtube.com/watch?v=${youtubeId}`,
            });
          }
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to resolve channel videos";
        await db
          .update(batches)
          .set({
            status: "failed",
            stageLabel: "Failed",
            errorMessage: errorMsg,
            updatedAt: new Date(),
          })
          .where(eq(batches.id, batchId));
        throw new Error(errorMsg);
      }

      if (videos.length === 0) {
        await db
          .update(batches)
          .set({
            status: "failed",
            stageLabel: "Failed",
            errorMessage: "No valid videos to process",
            updatedAt: new Date(),
          })
          .where(eq(batches.id, batchId));
        throw new Error("No valid videos to process");
      }

      await db
        .update(batches)
        .set({
          status: "processing",
          stageLabel: `Queuing ${videos.length} videos…`,
          channelId,
          channelTitle,
          totalCount: videos.length,
          updatedAt: new Date(),
        })
        .where(eq(batches.id, batchId));

      const createdJobs: Array<{
        jobId: string;
        youtubeUrl: string;
        youtubeId: string;
      }> = [];

      const { getActiveTeamId } = await import("@/lib/teams");
      const teamId = await getActiveTeamId(batch.userId);

      for (const video of videos) {
        const [job] = await db
          .insert(jobs)
          .values({
            userId: batch.userId,
            teamId,
            batchId: batch.id,
            youtubeUrl: video.url,
            applyStyle: batch.applyStyle,
            language: batch.language ?? "auto",
            status: "queued",
            stageLabel: "Queued…",
          })
          .returning({ id: jobs.id });

        createdJobs.push({
          jobId: job.id,
          youtubeUrl: video.url,
          youtubeId: video.youtubeId,
        });
      }

      return {
        userId: batch.userId,
        applyStyle: batch.applyStyle,
        language: batch.language ?? "auto",
        teamId,
        jobs: createdJobs,
      };
    });

    await step.sendEvent(
      "fan-out-generate",
      resolved.jobs.map((job) => ({
        name: events.generateRequested,
        data: {
          jobId: job.jobId,
          youtubeUrl: job.youtubeUrl,
          youtubeId: job.youtubeId,
          userId: resolved.userId,
          applyStyle: resolved.applyStyle,
          language: resolved.language,
          teamId: resolved.teamId,
          batchId,
        },
      })),
    );

    // Poll progress while children run (children also refresh on finish).
    for (let i = 0; i < 40; i++) {
      const progress = await step.run(`refresh-progress-${i}`, async () =>
        refreshBatchProgress(batchId),
      );
      if (progress.status === "complete" || progress.status === "failed") {
        return progress;
      }
      await step.sleep(`wait-${i}`, "15s");
    }

    return refreshBatchProgress(batchId);
  },
);
