import { z } from "zod";
import {
  DEFAULT_FORMAT_ID,
  isPostFormatId,
} from "@/lib/post-formats";
import { extractYoutubeId } from "@/lib/youtube-id";

export const socialPlatformSchema = z.enum(["linkedin", "x"]);
export type SocialPlatform = z.infer<typeof socialPlatformSchema>;

export const postFormatIdSchema = z
  .string()
  .refine(isPostFormatId, { message: "Unknown post format" });

export const generateRequestSchema = z.object({
  youtubeUrl: z
    .string()
    .min(1, "YouTube URL is required")
    .max(500, "URL is too long")
    .transform((value) => value.trim())
    .refine((value) => extractYoutubeId(value) !== null, {
      message: "Enter a valid YouTube video URL",
    }),
  applyStyle: z.boolean().optional().default(true),
  formatId: postFormatIdSchema.optional().default(DEFAULT_FORMAT_ID),
  platforms: z
    .array(socialPlatformSchema)
    .min(1, "Select at least one platform")
    .max(2)
    .optional()
    .default(["linkedin", "x"]),
  language: z
    .enum([
      "auto",
      "en",
      "es",
      "fr",
      "de",
      "pt",
      "hi",
      "ja",
      "ko",
      "it",
      "nl",
      "ar",
    ])
    .optional()
    .default("auto"),
  teamId: z.string().uuid().optional().nullable(),
});

export const styleProfileRequestSchema = z.object({
  samples: z
    .array(
      z
        .string()
        .min(20, "Each sample should be at least 20 characters")
        .max(5000, "Each sample must be under 5000 characters")
        .transform((value) => value.trim()),
    )
    .min(3, "Paste at least 3 sample posts")
    .max(5, "Up to 5 sample posts"),
  enabled: z.boolean().optional().default(true),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export const regenerateRequestSchema = z.object({
  formatId: postFormatIdSchema.optional(),
});
