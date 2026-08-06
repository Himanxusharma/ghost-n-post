import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import type { CarouselSlide } from "@/lib/content";

export {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  type CarouselSlide,
} from "@/lib/content";

/** Job lifecycle stages surfaced to the UI progress indicator. */
export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "fetching",
  "transcribing",
  "writing",
  "complete",
  "failed",
]);

export const socialPlatformEnum = pgEnum("social_platform", [
  "linkedin",
  "x",
]);

export const publicationStatusEnum = pgEnum("publication_status", [
  "pending",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "cancelled",
]);

export const batchStatusEnum = pgEnum("batch_status", [
  "queued",
  "resolving",
  "processing",
  "complete",
  "failed",
  "cancelled",
]);

export const batchTypeEnum = pgEnum("batch_type", ["urls", "channel"]);

export const teamRoleEnum = pgEnum("team_role", [
  "owner",
  "admin",
  "member",
]);

export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "revoked",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  email: varchar("email", { length: 320 }),
  /** Display name from Clerk (Google profile / full name). */
  displayName: varchar("display_name", { length: 200 }),
  /** Active team for shared workspace context (Phase 4). */
  activeTeamId: uuid("active_team_id"),
  preferredLanguage: varchar("preferred_language", { length: 8 })
    .default("auto")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const videos = pgTable("videos", {
  id: uuid("id").defaultRandom().primaryKey(),
  youtubeId: varchar("youtube_id", { length: 32 }).notNull().unique(),
  title: text("title"),
  channelName: text("channel_name"),
  durationSeconds: integer("duration_seconds"),
  thumbnailUrl: text("thumbnail_url"),
  thumbnailBlobUrl: text("thumbnail_blob_url"),
  transcriptBlobUrl: text("transcript_blob_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  teamId: uuid("team_id"),
  batchId: uuid("batch_id"),
  videoId: uuid("video_id").references(() => videos.id, {
    onDelete: "set null",
  }),
  youtubeUrl: text("youtube_url").notNull(),
  status: jobStatusEnum("status").default("queued").notNull(),
  stageLabel: text("stage_label").default("Queued…").notNull(),
  errorMessage: text("error_message"),
  postId: uuid("post_id"),
  applyStyle: boolean("apply_style").default(true).notNull(),
  /** Output language for drafts; `auto` detects from transcript. */
  language: varchar("language", { length: 8 }).default("auto").notNull(),
  /** LinkedIn structure template id (hook-list, numbered-takeaways, …). */
  formatId: varchar("format_id", { length: 64 }).default("hook-list").notNull(),
  /** Which platforms to generate drafts for. */
  platforms: jsonb("platforms")
    .$type<Array<"linkedin" | "x">>()
    .default(["linkedin", "x"])
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  teamId: uuid("team_id"),
  videoId: uuid("video_id")
    .references(() => videos.id, { onDelete: "cascade" })
    .notNull(),
  jobId: uuid("job_id")
    .references(() => jobs.id, { onDelete: "cascade" })
    .notNull(),
  linkedinDraft: text("linkedin_draft").notNull(),
  xDraft: text("x_draft").notNull(),
  xThread: jsonb("x_thread").$type<string[]>().default([]).notNull(),
  /** Platforms this post was generated for. */
  platforms: jsonb("platforms")
    .$type<Array<"linkedin" | "x">>()
    .default(["linkedin", "x"])
    .notNull(),
  /** Structure template used for LinkedIn draft. */
  formatId: varchar("format_id", { length: 64 }).default("hook-list").notNull(),
  regenerateCount: integer("regenerate_count").default(0).notNull(),
  language: varchar("language", { length: 8 }).default("en").notNull(),
  /** Phase 2: generated quote-card / carousel slides */
  carouselSlides: jsonb("carousel_slides")
    .$type<CarouselSlide[]>()
    .default([])
    .notNull(),
  carouselGeneratedAt: timestamp("carousel_generated_at", {
    withTimezone: true,
  }),
  /** Phase 4: custom branded thumbnail */
  customThumbnailUrl: text("custom_thumbnail_url"),
  customThumbnailHeadline: text("custom_thumbnail_headline"),
  customThumbnailGeneratedAt: timestamp("custom_thumbnail_generated_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const styleProfiles = pgTable("style_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  samples: jsonb("samples").$type<string[]>().default([]).notNull(),
  profileText: text("profile_text").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Connected LinkedIn / X accounts with posting tokens. */
export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    platform: socialPlatformEnum("platform").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    platformUserId: text("platform_user_id").notNull(),
    platformUsername: text("platform_username"),
    displayName: text("display_name"),
    scopes: text("scopes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userPlatformUidx: uniqueIndex("social_accounts_user_platform_uidx").on(
      table.userId,
      table.platform,
    ),
  }),
);

/** Immediate or scheduled publications to LinkedIn / X. */
export const publications = pgTable("publications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  postId: uuid("post_id")
    .references(() => posts.id, { onDelete: "cascade" })
    .notNull(),
  platform: socialPlatformEnum("platform").notNull(),
  status: publicationStatusEnum("status").default("pending").notNull(),
  content: text("content").notNull(),
  /** Extra thread parts for X (tweet 2..n). */
  threadParts: jsonb("thread_parts").$type<string[]>().default([]).notNull(),
  mediaUrls: jsonb("media_urls").$type<string[]>().default([]).notNull(),
  includeCarousel: boolean("include_carousel").default(false).notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  externalPostId: text("external_post_id"),
  externalUrl: text("external_url"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Phase 3: batch URL list or YouTube channel processing. */
export const batches = pgTable("batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: batchTypeEnum("type").notNull(),
  sourceInput: text("source_input").notNull(),
  channelId: text("channel_id"),
  channelTitle: text("channel_title"),
  status: batchStatusEnum("status").default("queued").notNull(),
  stageLabel: text("stage_label").default("Queued…").notNull(),
  applyStyle: boolean("apply_style").default(true).notNull(),
  language: varchar("language", { length: 8 }).default("auto").notNull(),
  maxVideos: integer("max_videos").default(10).notNull(),
  totalCount: integer("total_count").default(0).notNull(),
  completedCount: integer("completed_count").default(0).notNull(),
  failedCount: integer("failed_count").default(0).notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Phase 3: API tokens for the Chrome extension (and other clients). */
export const extensionTokens = pgTable("extension_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 120 }).default("Chrome extension").notNull(),
  tokenPrefix: varchar("token_prefix", { length: 12 }).notNull(),
  tokenHash: text("token_hash").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Phase 3: engagement snapshots for published posts. */
export const publicationMetrics = pgTable("publication_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicationId: uuid("publication_id")
    .references(() => publications.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  likes: integer("likes").default(0).notNull(),
  comments: integer("comments").default(0).notNull(),
  shares: integer("shares").default(0).notNull(),
  impressions: integer("impressions").default(0).notNull(),
  views: integer("views").default(0).notNull(),
  raw: jsonb("raw").$type<Record<string, unknown>>().default({}).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Phase 4: multi-seat team workspaces. */
export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  ownerUserId: text("owner_user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  defaultLanguage: varchar("default_language", { length: 8 })
    .default("auto")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: teamRoleEnum("role").default("member").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    teamUserUidx: uniqueIndex("team_members_team_user_uidx").on(
      table.teamId,
      table.userId,
    ),
  }),
);

export const teamInvites = pgTable("team_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: teamRoleEnum("role").default("member").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  status: inviteStatusEnum("status").default("pending").notNull(),
  invitedByUserId: text("invited_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type StyleProfile = typeof styleProfiles.$inferSelect;
export type SocialAccount = typeof socialAccounts.$inferSelect;
export type Publication = typeof publications.$inferSelect;
export type Batch = typeof batches.$inferSelect;
export type ExtensionToken = typeof extensionTokens.$inferSelect;
export type PublicationMetric = typeof publicationMetrics.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type TeamInvite = typeof teamInvites.$inferSelect;
