import { and, eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { getDb } from "@/db";
import { teamInvites, teamMembers, teams, users } from "@/db/schema";

export async function ensureUserRow(
  userId: string,
  email?: string | null,
  displayName?: string | null,
) {
  const db = getDb();
  const trimmedName = displayName?.trim() || null;
  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  await db
    .insert(users)
    .values({
      id: userId,
      email: email ?? null,
      displayName: trimmedName,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        ...(email !== undefined ? { email: email ?? null } : {}),
        ...(trimmedName ? { displayName: trimmedName } : {}),
      },
    });

  // If new user signup, send welcome email
  if (!existing && email) {
    const { sendWelcomeEmail } = await import("@/lib/email");
    sendWelcomeEmail({ to: email, userName: trimmedName || undefined }).catch(
      (err) => console.error("[welcome-email] Error sending welcome email:", err),
    );
  }
}

export async function getActiveTeamId(userId: string): Promise<string | null> {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user?.activeTeamId) return null;

  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, user.activeTeamId),
      eq(teamMembers.userId, userId),
    ),
  });
  return membership ? user.activeTeamId : null;
}

export async function requireTeamMember(
  userId: string,
  teamId: string,
): Promise<{ role: "owner" | "admin" | "member" }> {
  const db = getDb();
  const membership = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
  });
  if (!membership) {
    throw new Error("Not a member of this team");
  }
  return { role: membership.role };
}

export async function requireTeamAdmin(
  userId: string,
  teamId: string,
): Promise<{ role: "owner" | "admin" }> {
  const { role } = await requireTeamMember(userId, teamId);
  if (role !== "owner" && role !== "admin") {
    throw new Error("Team admin access required");
  }
  return { role };
}

export async function requireTeamOwner(userId: string, teamId: string) {
  const db = getDb();
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });
  if (!team) {
    throw new Error("Team not found");
  }
  if (team.ownerUserId !== userId) {
    throw new Error("Only the team owner can delete this team");
  }
  return team;
}

/** Owner-only hard delete. Clears active-team pointers, then cascades members/invites. */
export async function deleteTeam(userId: string, teamId: string) {
  const team = await requireTeamOwner(userId, teamId);
  const db = getDb();

  await db
    .update(users)
    .set({ activeTeamId: null })
    .where(eq(users.activeTeamId, teamId));

  await db.delete(teams).where(eq(teams.id, teamId));
  return team;
}

export async function listUserTeams(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      role: teamMembers.role,
      defaultLanguage: teams.defaultLanguage,
      ownerUserId: teams.ownerUserId,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId));
  return rows;
}

export function slugifyTeamName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "team"
  );
}

export async function createTeam(input: {
  userId: string;
  name: string;
  defaultLanguage?: string;
}) {
  const db = getDb();
  const base = slugifyTeamName(input.name);
  let slug = base;
  for (let i = 0; i < 8; i++) {
    const existing = await db.query.teams.findFirst({
      where: eq(teams.slug, slug),
    });
    if (!existing) break;
    slug = `${base}-${randomBytes(2).toString("hex")}`;
  }

  const [team] = await db
    .insert(teams)
    .values({
      name: input.name.trim().slice(0, 120),
      slug,
      ownerUserId: input.userId,
      defaultLanguage: input.defaultLanguage ?? "auto",
    })
    .returning();

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: input.userId,
    role: "owner",
  });

  await db
    .update(users)
    .set({ activeTeamId: team.id })
    .where(eq(users.id, input.userId));

  return team;
}

export async function setActiveTeam(userId: string, teamId: string | null) {
  if (teamId) {
    await requireTeamMember(userId, teamId);
  }
  const db = getDb();
  await db
    .update(users)
    .set({ activeTeamId: teamId })
    .where(eq(users.id, userId));
}

export async function createTeamInvite(input: {
  teamId: string;
  email: string;
  role: "admin" | "member";
  invitedByUserId: string;
}) {
  const db = getDb();
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const [invite] = await db
    .insert(teamInvites)
    .values({
      teamId: input.teamId,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      token,
      invitedByUserId: input.invitedByUserId,
      expiresAt,
      status: "pending",
    })
    .returning();
  return invite;
}

export async function acceptTeamInvite(input: {
  token: string;
  userId: string;
  userEmail?: string | null;
}) {
  const db = getDb();
  const invite = await db.query.teamInvites.findFirst({
    where: eq(teamInvites.token, input.token),
  });
  if (!invite || invite.status !== "pending") {
    throw new Error("Invite not found or no longer valid");
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    throw new Error("Invite has expired");
  }
  if (
    !input.userEmail ||
    invite.email.toLowerCase() !== input.userEmail.toLowerCase()
  ) {
    throw new Error("Sign in with the invited email to accept");
  }

  await db
    .insert(teamMembers)
    .values({
      teamId: invite.teamId,
      userId: input.userId,
      role: invite.role === "owner" ? "member" : invite.role,
    })
    .onConflictDoNothing({
      target: [teamMembers.teamId, teamMembers.userId],
    });

  await db
    .update(teamInvites)
    .set({ status: "accepted" })
    .where(eq(teamInvites.id, invite.id));

  await db
    .update(users)
    .set({ activeTeamId: invite.teamId })
    .where(eq(users.id, input.userId));

  return invite.teamId;
}

export async function revokeTeamInvite(inviteId: string, userId: string) {
  const db = getDb();
  const invite = await db.query.teamInvites.findFirst({
    where: eq(teamInvites.id, inviteId),
  });
  if (!invite) throw new Error("Invite not found");
  await requireTeamAdmin(userId, invite.teamId);
  await db
    .update(teamInvites)
    .set({ status: "revoked" })
    .where(eq(teamInvites.id, inviteId));
}

export async function getTeamById(teamId: string) {
  const db = getDb();
  return db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });
}
