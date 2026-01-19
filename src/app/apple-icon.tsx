import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default async function Icon() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
      }}
    >
      {/* Logo Circles */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          position: "relative",
          width: "120px",
          height: "100px",
        }}
      >
        {/* Left circle */}
        <div
          style={{
            position: "absolute",
            left: "15px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            backgroundColor: "#c9a880",
          }}
        />
        {/* Connecting line */}
        <div
          style={{
            position: "absolute",
            left: "45px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "30px",
            height: "3px",
            background:
              "linear-gradient(to right, #c9a880, rgba(201, 168, 128, 0.3), #c9a880)",
          }}
        />
        {/* Right circle */}
        <div
          style={{
            position: "absolute",
            right: "15px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            backgroundColor: "#c9a880",
          }}
        />
      </div>
    </div>,
    {
      ...size,
    },
  );
}
