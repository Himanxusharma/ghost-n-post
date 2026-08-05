import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { batches, jobs } from "@/db/schema";

/** Recompute batch counters from child job statuses. */
export async function refreshBatchProgress(batchId: string) {
  const db = getDb();

  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where ${jobs.status} = 'complete')::int`,
      failed: sql<number>`count(*) filter (where ${jobs.status} = 'failed')::int`,
      active: sql<number>`count(*) filter (where ${jobs.status} not in ('complete', 'failed'))::int`,
    })
    .from(jobs)
    .where(eq(jobs.batchId, batchId));

  const total = counts?.total ?? 0;
  const completed = counts?.completed ?? 0;
  const failed = counts?.failed ?? 0;
  const active = counts?.active ?? 0;

  let status: "processing" | "complete" | "failed" = "processing";
  let stageLabel = `Processing ${completed + failed}/${total}…`;

  if (total > 0 && active === 0) {
    status = failed === total ? "failed" : "complete";
    stageLabel =
      failed === total
        ? "All videos failed"
        : failed > 0
          ? `Done — ${completed} ok, ${failed} failed`
          : "Batch complete";
  }

  await db
    .update(batches)
    .set({
      status,
      stageLabel,
      totalCount: total,
      completedCount: completed,
      failedCount: failed,
      updatedAt: new Date(),
    })
    .where(and(eq(batches.id, batchId)));

  return { total, completed, failed, status };
}
