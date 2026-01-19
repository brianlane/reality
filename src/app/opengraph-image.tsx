import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Reality Matchmaking";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo Container */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "48px",
          }}
        >
          {/* Text */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: 1,
            }}
          >
            <span
              style={{
                fontSize: "120px",
                fontWeight: "bold",
                color: "#c9a880",
                letterSpacing: "-0.02em",
              }}
            >
              REALITY
            </span>
            <span
              style={{
                fontSize: "32px",
                fontWeight: "500",
                color: "#4a5568",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginTop: "8px",
              }}
            >
              Matchmaking
            </span>
          </div>

          {/* Logo Circles */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              position: "relative",
              width: "192px",
              height: "160px",
            }}
          >
            {/* Left circle */}
            <div
              style={{
                position: "absolute",
                left: "24px",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#c9a880",
              }}
            />
            {/* Connecting line */}
            <div
              style={{
                position: "absolute",
                left: "72px",
                width: "48px",
                height: "4px",
                background:
                  "linear-gradient(to right, #c9a880, rgba(201, 168, 128, 0.3), #c9a880)",
              }}
            />
            {/* Right circle */}
            <div
              style={{
                position: "absolute",
                right: "24px",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#c9a880",
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
