import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { teamMembers, type Job, type Post } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";

export type AccessDenied = {
  status: 401 | 403;
  code: "UNAUTHORIZED" | "FORBIDDEN";
  message: string;
};

/**
 * Authorize access to a post.
 * - Anonymous posts (no userId): allowed via UUID capability (demo/polling flow).
 * - Owned posts: caller must be the owner or a member of the post's team.
 */
export async function authorizePostAccess(
  post: Post,
  request?: Request,
): Promise<{ userId: string | null } | AccessDenied> {
  if (!post.userId) {
    return { userId: null };
  }

  const authed = await requireUser(request);
  const clerk = await auth();
  const userId = authed?.userId ?? clerk.userId ?? null;

  if (!userId) {
    return {
      status: 401,
      code: "UNAUTHORIZED",
      message: "Sign in to access this post",
    };
  }

  if (post.userId === userId) {
    return { userId };
  }

  if (post.teamId) {
    const allowed = await isTeamMember(userId, post.teamId);
    if (allowed) return { userId };
  }

  return {
    status: 403,
    code: "FORBIDDEN",
    message: "Not your post",
  };
}

/**
 * Authorize access to a job.
 * Anonymous jobs are readable by UUID; owned jobs require owner/team membership.
 */
export async function authorizeJobAccess(
  job: Job,
  request?: Request,
): Promise<{ userId: string | null } | AccessDenied> {
  if (!job.userId) {
    return { userId: null };
  }

  const authed = await requireUser(request);
  const clerk = await auth();
  const userId = authed?.userId ?? clerk.userId ?? null;

  if (!userId) {
    return {
      status: 401,
      code: "UNAUTHORIZED",
      message: "Sign in to access this job",
    };
  }

  if (job.userId === userId) {
    return { userId };
  }

  if (job.teamId) {
    const allowed = await isTeamMember(userId, job.teamId);
    if (allowed) return { userId };
  }

  return {
    status: 403,
    code: "FORBIDDEN",
    message: "Not your job",
  };
}

/** Mutating post actions for owned resources; anonymous posts may be claimed. */
export async function authorizePostMutation(
  post: Post,
  request?: Request,
  options?: { allowAnonymousCapability?: boolean },
): Promise<{ userId: string | null } | AccessDenied> {
  const allowAnonymous = options?.allowAnonymousCapability ?? false;

  if (!post.userId && allowAnonymous) {
    const authed = await requireUser(request);
    const clerk = await auth();
    return { userId: authed?.userId ?? clerk.userId ?? null };
  }

  const authed = await requireUser(request);
  const clerk = await auth();
  const userId = authed?.userId ?? clerk.userId ?? null;

  if (!userId) {
    return {
      status: 401,
      code: "UNAUTHORIZED",
      message: "Sign in required",
    };
  }

  if (post.userId && post.userId !== userId) {
    return {
      status: 403,
      code: "FORBIDDEN",
      message: "Not your post",
    };
  }

  return { userId };
}

export function isAccessDenied(
  value: unknown,
): value is AccessDenied {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "code" in value &&
    "message" in value
  );
}

async function isTeamMember(userId: string, teamId: string): Promise<boolean> {
  const db = getDb();
  const membership = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
  });
  return Boolean(membership);
}

/**
 * Allow only same-origin relative paths for OAuth return redirects.
 * Rejects absolute URLs, protocol-relative URLs, and path traversal.
 */
export function sanitizeReturnTo(raw: string | null | undefined): string {
  const fallback = "/connections";
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }
  if (trimmed.includes("://") || trimmed.includes("\\") || trimmed.includes("..")) {
    return fallback;
  }
  const withoutHash = trimmed.split("#")[0] ?? "";
  if (!/^\/[a-zA-Z0-9/_\-.?=&%]*$/.test(withoutHash)) {
    return fallback;
  }
  return withoutHash || fallback;
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}
