import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
      }}
    >
      <svg
        width="180"
        height="60"
        viewBox="0 0 180 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line
          x1="16"
          y1="30"
          x2="44"
          y2="30"
          stroke="#c9a880"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="10" cy="30" r="6" fill="#c9a880" />
        <circle cx="50" cy="30" r="6" fill="#c9a880" />
        <text
          x="64"
          y="27"
          fontFamily="Arial, sans-serif"
          fontSize="14"
          fontWeight="700"
          fill="#1a1a2e"
          letterSpacing="0.5"
        >
          REALITY
        </text>
        <text
          x="64"
          y="43"
          fontFamily="Arial, sans-serif"
          fontSize="10"
          fontWeight="500"
          fill="#4a5568"
          letterSpacing="1"
        >
          MATCHMAKING
        </text>
      </svg>
    </div>,
    {
      width: 240,
      height: 80,
    },
  );
}
