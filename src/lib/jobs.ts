import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { jobs } from "@/db/schema";

export type JobStage =
  | "queued"
  | "fetching"
  | "transcribing"
  | "writing"
  | "complete"
  | "failed";

const STAGE_LABELS: Record<JobStage, string> = {
  queued: "Queued…",
  fetching: "Fetching video…",
  transcribing: "Transcribing…",
  writing: "Writing draft…",
  complete: "Done",
  failed: "Failed",
};

export async function updateJobStage(
  jobId: string,
  status: JobStage,
  extras: {
    errorMessage?: string | null;
    postId?: string | null;
    videoId?: string | null;
    stageLabel?: string;
  } = {},
) {
  const db = getDb();
  await db
    .update(jobs)
    .set({
      status,
      stageLabel: extras.stageLabel ?? STAGE_LABELS[status],
      errorMessage: extras.errorMessage ?? null,
      postId: extras.postId ?? undefined,
      videoId: extras.videoId ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));
}
