import { auth, currentUser } from "@clerk/nextjs/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { extensionTokens, users } from "@/db/schema";
import { mintExtensionToken } from "@/lib/auth/require-user";

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
    const tokens = await db
      .select({
        id: extensionTokens.id,
        name: extensionTokens.name,
        tokenPrefix: extensionTokens.tokenPrefix,
        lastUsedAt: extensionTokens.lastUsedAt,
        createdAt: extensionTokens.createdAt,
        revokedAt: extensionTokens.revokedAt,
      })
      .from(extensionTokens)
      .where(
        and(
          eq(extensionTokens.userId, userId),
          isNull(extensionTokens.revokedAt),
        ),
      )
      .orderBy(desc(extensionTokens.createdAt));

    return NextResponse.json({ success: true, data: tokens });
  } catch (error) {
    console.error("[GET /api/extension/tokens]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to list tokens" },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const db = getDb();
    const clerkUser = await currentUser();
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

    const minted = mintExtensionToken();
    const [row] = await db
      .insert(extensionTokens)
      .values({
        userId,
        name: body.name?.trim() || "Chrome extension",
        tokenPrefix: minted.prefix,
        tokenHash: minted.hash,
      })
      .returning({
        id: extensionTokens.id,
        name: extensionTokens.name,
        tokenPrefix: extensionTokens.tokenPrefix,
        createdAt: extensionTokens.createdAt,
      });

    return NextResponse.json({
      success: true,
      data: {
        ...row,
        // Shown once — client must copy it into the extension.
        token: minted.rawToken,
      },
    });
  } catch (error) {
    console.error("[POST /api/extension/tokens]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to create token" },
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

    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "id is required" },
        },
        { status: 400 },
      );
    }

    const db = getDb();
    await db
      .update(extensionTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(extensionTokens.id, id), eq(extensionTokens.userId, userId)),
      );

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("[DELETE /api/extension/tokens]", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to revoke token" },
      },
      { status: 500 },
    );
  }
}
