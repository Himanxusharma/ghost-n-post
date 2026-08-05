import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/** Renders a single quote-card slide used by carousel generation. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const headline = searchParams.get("headline") || "Ghost n Post";
  const body = searchParams.get("body") || "";
  const index = searchParams.get("index") || "1";
  const total = searchParams.get("total") || "1";

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
          background: "linear-gradient(145deg, #0f1b2d 0%, #163a45 55%, #0f7a7a 140%)",
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
            {index}/{total}
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
            {headline}
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
            {body}
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
              width: `${(Number(index) / Math.max(Number(total), 1)) * 100}%`,
              background: "#9ad5d5",
              borderRadius: 999,
            }}
          />
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
    },
  );
}
