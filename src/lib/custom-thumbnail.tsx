import { ImageResponse } from "next/og";
import { z } from "zod";
import { uploadBlob } from "@/lib/blob";
import { completeJson } from "@/lib/llm";

const thumbSchema = z.object({
  headline: z.string().min(1).max(90),
  subtext: z.string().min(1).max(140),
});

/**
 * Generate a branded custom thumbnail for a post (quote-card style).
 * Copy is drafted via Groq; the image is rendered with next/og.
 */
export async function generateCustomThumbnail(input: {
  postId: string;
  title: string;
  linkedinDraft: string;
  language?: string;
}): Promise<{ imageUrl: string; headline: string; subtext: string }> {
  const language =
    input.language && input.language !== "auto" ? input.language : "en";

  const parsedRaw = await completeJson(
    `Create a short thumbnail headline + subtext for a social post image.

Video/topic: ${input.title}
Language: ${language}

Draft:
"""
${input.linkedinDraft.slice(0, 2500)}
"""

Return JSON:
{ "headline": "max 8 words", "subtext": "max 16 words supporting line" }

Write in ${language}. No hashtags. No emoji overload.`,
    512,
  );

  const parsed = thumbSchema.parse(parsedRaw);
  const imageResponse = await renderCustomThumbnail({
    headline: parsed.headline,
    subtext: parsed.subtext,
    brand: "Ghost n Post",
  });
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const imageUrl = await uploadBlob(
    `custom-thumbnails/${input.postId}.png`,
    buffer,
    "image/png",
  );

  return {
    imageUrl,
    headline: parsed.headline,
    subtext: parsed.subtext,
  };
}

async function renderCustomThumbnail(input: {
  headline: string;
  subtext: string;
  brand: string;
}): Promise<Response> {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "linear-gradient(160deg, #122033 0%, #0f4c4c 50%, #0f7a7a 100%)",
          color: "#f5f8fb",
          fontFamily: "Georgia, Times New Roman, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            opacity: 0.75,
            fontFamily: "sans-serif",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {input.brand}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 72,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              maxWidth: "92%",
            }}
          >
            {input.headline}
          </div>
          <div
            style={{
              fontSize: 32,
              lineHeight: 1.35,
              opacity: 0.9,
              maxWidth: "88%",
              fontFamily: "sans-serif",
            }}
          >
            {input.subtext}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            height: 8,
            width: "40%",
            background: "#9ad5d5",
            borderRadius: 999,
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
