import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Apple touch / PWA icon — same monogram, larger canvas.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e0e0c",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 14,
            border: "4px solid #e8ff47",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "#e8ff47",
              fontSize: 96,
              fontWeight: 700,
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              letterSpacing: "-0.06em",
              lineHeight: 1,
            }}
          >
            G
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
