import { z } from "zod";

export const publishRequestSchema = z.object({
  platform: z.enum(["linkedin", "x"]),
  content: z.string().min(1).max(12_000).optional(),
  threadParts: z
    .array(z.string().min(1).max(280))
    .max(25)
    .optional(),
  includeCarousel: z.boolean().optional().default(false),
  includeCustomThumbnail: z.boolean().optional().default(false),
  /** ISO datetime — if set, schedules instead of publishing immediately */
  scheduledFor: z.string().datetime().optional(),
});

export type PublishRequest = z.infer<typeof publishRequestSchema>;
