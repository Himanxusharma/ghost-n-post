import { eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { getDb } from "@/db";
import { jobs, posts, styleProfiles, videos } from "@/db/schema";
import { mirrorRemoteImage, uploadBlob } from "@/lib/blob";
import { generateSocialPosts } from "@/lib/generation";
import { updateJobStage } from "@/lib/jobs";
import { transcribeFromAudioUrl } from "@/lib/transcription";
import {
  fetchCaptionsTranscript,
  fetchVideoMetadata,
} from "@/lib/youtube";
import { events, inngest } from "../client";

const MAX_FREE_VIDEO_SECONDS = 3 * 60 + 10; // 3 min 10s (190s) allowance for 3-minute videos with YouTube end cards

/**
 * Durable multi-step pipeline:
 * fetch-metadata → get-transcript → generate-posts → persist-result
 */
export const generateVideoPosts = inngest.createFunction(
  {
    id: "generate-video-posts",
    triggers: [{ event: events.generateRequested }],
    retries: 2,
  },
  async ({ event, step }) => {
    const { jobId, youtubeUrl, userId, applyStyle, language, teamId, platforms, formatId } =
      event.data as {
        jobId: string;
        youtubeUrl: string;
        userId: string | null;
        applyStyle: boolean;
        language?: string;
        formatId?: string;
        platforms?: Array<"linkedin" | "x">;
        teamId?: string | null;
        batchId?: string;
      };

    const requestedLanguage = language || "auto";
    const selectedPlatforms =
      platforms && platforms.length > 0 ? platforms : (["linkedin", "x"] as const);
    const selectedFormatId = formatId || "hook-list";

    try {
      const metadata = await step.run("fetch-metadata", async () => {
        await updateJobStage(jobId, "fetching");
        const meta = await fetchVideoMetadata(youtubeUrl);

        if (meta.isPrivate) {
          throw new NonRetriableError(
            "This video is private. Only public videos are supported in MVP.",
          );
        }

        if (meta.durationSeconds > MAX_FREE_VIDEO_SECONDS) {
          const durationFormatted =
            meta.durationSeconds > 0
              ? `${Math.floor(meta.durationSeconds / 60)} min ${meta.durationSeconds % 60} sec`
              : "longer than 3 minutes";
          throw new NonRetriableError(
            `Free plan supports videos up to 3 minutes max. This video is ${durationFormatted}. Upgrade to Pro for longer video repurposing.`,
          );
        }

        const thumbnailBlobUrl = await mirrorRemoteImage(
          `thumbnails/${meta.youtubeId}.jpg`,
          meta.thumbnailUrl,
        );

        const db = getDb();
        const existing = await db.query.videos.findFirst({
          where: eq(videos.youtubeId, meta.youtubeId),
        });

        let videoId: string;
        if (existing) {
          videoId = existing.id;
          await db
            .update(videos)
            .set({
              title: meta.title,
              channelName: meta.channelName,
              durationSeconds: meta.durationSeconds,
              thumbnailUrl: meta.thumbnailUrl,
              thumbnailBlobUrl,
            })
            .where(eq(videos.id, existing.id));
        } else {
          const [inserted] = await db
            .insert(videos)
            .values({
              youtubeId: meta.youtubeId,
              title: meta.title,
              channelName: meta.channelName,
              durationSeconds: meta.durationSeconds,
              thumbnailUrl: meta.thumbnailUrl,
              thumbnailBlobUrl,
            })
            .returning({ id: videos.id });
          videoId = inserted.id;
        }

        await updateJobStage(jobId, "fetching", {
          videoId,
          stageLabel: "Fetching video…",
        });

        return { ...meta, videoId, thumbnailBlobUrl };
      });

      const transcript = await step.run("get-transcript", async () => {
        await updateJobStage(jobId, "transcribing");

        const captions = await fetchCaptionsTranscript(metadata.youtubeId);
        let result = captions;

        if (!result) {
          try {
            result = await transcribeFromAudioUrl(
              metadata.youtubeId,
              requestedLanguage,
            );
          } catch (error) {
            const detail =
              error instanceof Error ? error.message : "STT fallback failed";
            throw new NonRetriableError(
              `No captions found for this video, and speech-to-text fallback failed (${detail}). ` +
                "Use a video with captions/subtitles, or set a real DEEPGRAM_API_KEY once audio URLs resolve.",
            );
          }
        }

        if (!result.text.trim()) {
          throw new NonRetriableError(
            "No spoken content found. Music-only videos can't be turned into posts.",
          );
        }

        const transcriptBlobUrl = await uploadBlob(
          `transcripts/${metadata.youtubeId}.json`,
          JSON.stringify(result),
          "application/json",
        );

        const db = getDb();
        await db
          .update(videos)
          .set({ transcriptBlobUrl })
          .where(eq(videos.id, metadata.videoId));

        return {
          text: result.text,
          source: result.source,
          transcriptBlobUrl,
        };
      });

      const generated = await step.run("generate-posts", async () => {
        await updateJobStage(jobId, "writing");

        const { detectLanguageFromText } = await import("@/lib/language");
        const outputLanguage =
          requestedLanguage === "auto"
            ? detectLanguageFromText(transcript.text)
            : requestedLanguage;

        let styleProfile: string | null = null;
        if (applyStyle && userId) {
          const db = getDb();
          const profile = await db.query.styleProfiles.findFirst({
            where: eq(styleProfiles.userId, userId),
          });
          if (profile?.enabled) {
            styleProfile = profile.profileText;
          }
        }

        const drafts = await generateSocialPosts({
          title: metadata.title,
          channelName: metadata.channelName,
          transcript: transcript.text,
          styleProfile,
          language: outputLanguage,
          platforms: [...selectedPlatforms],
          formatId: selectedFormatId,
          isProUser: Boolean(userId),
        });

        return {
          ...drafts,
          outputLanguage,
          platforms: [...selectedPlatforms],
          formatId: selectedFormatId,
        };
      });

      const postId = await step.run("persist-result", async () => {
        const db = getDb();
        const [post] = await db
          .insert(posts)
          .values({
            userId: userId ?? null,
            teamId: teamId ?? null,
            videoId: metadata.videoId,
            jobId,
            linkedinDraft: generated.linkedin,
            xDraft: generated.x,
            xThread: generated.xThread,
            platforms: generated.platforms,
            formatId: generated.formatId,
            language: generated.outputLanguage,
          })
          .returning({ id: posts.id });

        await db
          .update(jobs)
          .set({
            status: "complete",
            stageLabel: "Done",
            postId: post.id,
            videoId: metadata.videoId,
            language: generated.outputLanguage,
            formatId: generated.formatId,
            updatedAt: new Date(),
          })
          .where(eq(jobs.id, jobId));

        return post.id;
      });

      // Keep parent batch counters fresh when this job belongs to a batch.
      const batchId = (event.data as { batchId?: string }).batchId;
      if (batchId) {
        await step.run("refresh-batch-progress", async () => {
          const { refreshBatchProgress } = await import("@/lib/batch/progress");
          return refreshBatchProgress(batchId);
        });
      }

      return { postId, videoId: metadata.videoId };
    } catch (error) {
      const { sanitizeUserErrorMessage } = await import("@/lib/errors");
      const message = sanitizeUserErrorMessage(error);

      await step.run("mark-failed", async () => {
        await updateJobStage(jobId, "failed", { errorMessage: message });
      });

      const batchId = (event.data as { batchId?: string }).batchId;
      if (batchId) {
        await step.run("refresh-batch-progress-failed", async () => {
          const { refreshBatchProgress } = await import("@/lib/batch/progress");
          return refreshBatchProgress(batchId);
        });
      }

      throw error;
    }
  },
);
