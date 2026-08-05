import { z } from "zod";
import { extractYoutubeId } from "@/lib/youtube-id";

export const batchRequestSchema = z
  .object({
    type: z.enum(["urls", "channel"]),
    urls: z.array(z.string()).max(25).optional(),
    channelInput: z.string().optional(),
    maxVideos: z.number().int().min(1).max(25).optional().default(10),
    applyStyle: z.boolean().optional().default(true),
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
  })
  .superRefine((value, ctx) => {
    if (value.type === "urls") {
      const urls = (value.urls ?? []).map((u) => u.trim()).filter(Boolean);
      if (urls.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Provide at least one YouTube URL",
          path: ["urls"],
        });
      }
      for (const [index, url] of urls.entries()) {
        if (!extractYoutubeId(url)) {
          ctx.addIssue({
            code: "custom",
            message: `Invalid YouTube URL at position ${index + 1}`,
            path: ["urls", index],
          });
        }
      }
    } else if (!value.channelInput?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Provide a channel URL, @handle, or channel id",
        path: ["channelInput"],
      });
    }
  });

export type BatchRequest = z.infer<typeof batchRequestSchema>;
