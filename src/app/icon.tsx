import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Browser tab icon — dark paper + acid accent monogram.
 */
export default function Icon() {
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
            inset: 2,
            border: "1.5px solid #e8ff47",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "#e8ff47",
              fontSize: 18,
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
