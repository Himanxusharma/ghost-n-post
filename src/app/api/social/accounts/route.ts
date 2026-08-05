import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { socialAccounts } from "@/db/schema";
import { linkedinConfigured } from "@/lib/social/linkedin";
import { xConfigured } from "@/lib/social/x";

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
    const accounts = await db.query.socialAccounts.findMany({
      where: eq(socialAccounts.userId, userId),
    });

    return NextResponse.json({
      success: true,
      data: {
        configured: {
          linkedin: linkedinConfigured(),
          x: xConfigured(),
        },
        accounts: accounts.map((account) => ({
          id: account.id,
          platform: account.platform,
          displayName: account.displayName,
          platformUsername: account.platformUsername,
          connectedAt: account.createdAt,
          expiresAt: account.expiresAt,
        })),
      },
    });
  } catch (error) {
    console.error("[GET /api/social/accounts]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to load accounts" },
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    if (platform !== "linkedin" && platform !== "x") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "platform must be linkedin or x" },
        },
        { status: 400 },
      );
    }

    const db = getDb();
    await db
      .delete(socialAccounts)
      .where(
        and(
          eq(socialAccounts.userId, userId),
          eq(socialAccounts.platform, platform),
        ),
      );

    return NextResponse.json({ success: true, data: { platform } });
  } catch (error) {
    console.error("[DELETE /api/social/accounts]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to disconnect" },
      },
      { status: 500 },
    );
  }
}
