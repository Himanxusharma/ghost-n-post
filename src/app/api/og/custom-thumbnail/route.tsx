import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * Preview route for custom thumbnail OG cards (query-param driven).
 * Production generation uses `generateCustomThumbnail` + Blob upload.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const headline = (searchParams.get("headline") || "Your next post").slice(0, 90);
  const subtext = (
    searchParams.get("subtext") ||
    "Video in. Voice out."
  ).slice(0, 140);

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
          Ghost n Post
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
            {headline.slice(0, 90)}
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
            {subtext.slice(0, 140)}
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
