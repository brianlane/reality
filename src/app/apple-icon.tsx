import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

// Image generation
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "white",
      }}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Connecting line */}
        <line
          x1="18"
          y1="24"
          x2="30"
          y2="24"
          stroke="#c9a880"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Left circle */}
        <circle cx="12" cy="24" r="6" fill="#c9a880" />
        {/* Right circle */}
        <circle cx="36" cy="24" r="6" fill="#c9a880" />
      </svg>
    </div>,
    {
      ...size,
    },
  );
}
