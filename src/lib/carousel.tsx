import { ImageResponse } from "next/og";
import { z } from "zod";
import type { CarouselSlide } from "@/lib/content";
import { uploadBlob } from "@/lib/blob";
import { completeJson } from "@/lib/llm";

const slidesSchema = z.object({
  slides: z
    .array(
      z.object({
        headline: z.string().min(1).max(80),
        body: z.string().min(1).max(220),
      }),
    )
    .min(3)
    .max(6),
});

/**
 * Ask Groq for carousel slide copy, render each slide with next/og,
 * and store PNGs in Vercel Blob.
 */
export async function generateCarouselSlides(input: {
  postId: string;
  title: string;
  linkedinDraft: string;
  styleProfile?: string | null;
}): Promise<CarouselSlide[]> {
  const style =
    input.styleProfile?.trim() ||
    "Clear, professional, punchy. Short lines. No hashtag spam. No em dashes.";

  const parsedRaw = await completeJson(
    `Turn this LinkedIn draft into a 3 to 6 slide carousel for LinkedIn/X image posts.

Video/topic: ${input.title}
Style: ${style}

Draft:
"""
${input.linkedinDraft}
"""

Return JSON:
{
  "slides": [
    { "headline": "short hook", "body": "1-2 supporting sentences" }
  ]
}

Rules: slide 1 is the hook, middle slides are insights, last slide is a soft CTA. No emoji overload. Never use em dashes (—) or en dashes (–).`,
    2048,
  );

  const parsed = slidesSchema.parse(parsedRaw);
  const slides: CarouselSlide[] = [];

  for (let i = 0; i < parsed.slides.length; i++) {
    const slide = parsed.slides[i];
    const imageResponse = await renderSlideImage({
      headline: slide.headline,
      body: slide.body,
      index: i + 1,
      total: parsed.slides.length,
    });
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const imageUrl = await uploadBlob(
      `carousels/${input.postId}/slide-${i + 1}.png`,
      buffer,
      "image/png",
    );
    slides.push({
      headline: slide.headline,
      body: slide.body,
      imageUrl,
    });
  }

  return slides;
}

async function renderSlideImage(input: {
  headline: string;
  body: string;
  index: number;
  total: number;
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
          padding: "64px",
          background:
            "linear-gradient(145deg, #0f1b2d 0%, #163a45 55%, #0f7a7a 140%)",
          color: "#f5f8fb",
          fontFamily: "Georgia, Times New Roman, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            opacity: 0.75,
            fontFamily: "sans-serif",
          }}
        >
          <span>Ghost n Post</span>
          <span>
            {input.index}/{input.total}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 54,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              maxWidth: "90%",
            }}
          >
            {input.headline}
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.4,
              opacity: 0.9,
              maxWidth: "92%",
              fontFamily: "sans-serif",
            }}
          >
            {input.body}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            height: 6,
            width: "100%",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 999,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(input.index / Math.max(input.total, 1)) * 100}%`,
              background: "#9ad5d5",
              borderRadius: 999,
            }}
          />
        </div>
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
