import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { jobs, users } from "@/db/schema";
import { events, inngest } from "@/inngest/client";
import { requireUser } from "@/lib/auth/require-user";
import { getAppBaseUrl, getPublicAppUrl } from "@/lib/env";
import { limitGenerate } from "@/lib/rate-limit";
import { extractYoutubeId } from "@/lib/youtube-id";
import { generateRequestSchema } from "@/lib/validations";

export const runtime = "nodejs";

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const appUrl = getPublicAppUrl();
  const allow =
    origin?.startsWith("chrome-extension://") ||
    origin?.includes("localhost") ||
    origin?.includes("127.0.0.1") ||
    (origin && appUrl && origin === appUrl)
      ? origin
      : appUrl;

  return {
    "Access-Control-Allow-Origin": allow || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);
  try {
    const body = await request.json();
    const parsed = generateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_URL",
            message: parsed.error.issues[0]?.message ?? "Invalid request",
          },
        },
        { status: 400, headers },
      );
    }

    const { youtubeUrl, applyStyle, language, teamId, platforms, formatId } =
      parsed.data;
    const youtubeId = extractYoutubeId(youtubeUrl)!;

    // Clerk session or extension API token
    const authed = await requireUser(request);
    const clerk = await auth();
    const userId = authed?.userId ?? clerk.userId ?? null;

    const rateKey = userId ?? getClientIp(request);
    const limit = await limitGenerate(rateKey);

    if (!limit.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many generations. Try again in a bit.",
          },
        },
        { status: 429, headers },
      );
    }

    // Extension token auth is required when no Clerk session and bearer present failed
    const hasBearer = Boolean(request.headers.get("authorization"));
    if (hasBearer && !authed) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid extension token" },
        },
        { status: 401, headers },
      );
    }

    const db = getDb();

    let resolvedTeamId: string | null = teamId ?? null;
    if (userId) {
      const clerkUser = clerk.userId ? await currentUser() : null;
      await db
        .insert(users)
        .values({
          id: userId,
          email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
          },
        });

      if (!resolvedTeamId) {
        const { getActiveTeamId } = await import("@/lib/teams");
        resolvedTeamId = await getActiveTeamId(userId);
      } else {
        try {
          const { requireTeamMember } = await import("@/lib/teams");
          await requireTeamMember(userId, resolvedTeamId);
        } catch {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "FORBIDDEN",
                message: "Not a member of this team",
              },
            },
            { status: 403, headers },
          );
        }
      }
    }

    const [job] = await db
      .insert(jobs)
      .values({
        userId: userId ?? null,
        teamId: resolvedTeamId,
        youtubeUrl,
        applyStyle,
        language,
        formatId,
        platforms,
        status: "queued",
        stageLabel: "Queued…",
      })
      .returning();

    await inngest.send({
      name: events.generateRequested,
      data: {
        jobId: job.id,
        youtubeUrl,
        youtubeId,
        userId: userId ?? null,
        applyStyle,
        language,
        formatId,
        platforms,
        teamId: resolvedTeamId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          jobId: job.id,
          youtubeId,
          appUrl: `${getAppBaseUrl()}/?jobId=${job.id}`,
        },
      },
      { headers },
    );
  } catch (error) {
    console.error("[POST /api/generate]", error);
    const { publicErrorMessage } = await import("@/lib/errors");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: publicErrorMessage(error, "Failed to start generation"),
        },
      },
      { status: 500, headers },
    );
  }
}

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  );
}
