"use client";

import { useEffect, useRef, useState } from "react";

type LogoProps = {
  size?: "small" | "large";
};

export default function Logo({ size = "small" }: LogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const animationFrameIdRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  // Size configurations
  const config =
    size === "large"
      ? {
          canvasWidth: 96,
          canvasHeight: 80,
          baseDistance: 24,
          radius: 12,
          textSize: "text-5xl",
          subtextSize: "text-sm",
          gap: "gap-6",
        }
      : {
          canvasWidth: 48,
          canvasHeight: 40,
          baseDistance: 12,
          radius: 6,
          textSize: "text-2xl",
          subtextSize: "text-[10px]",
          gap: "gap-3",
        };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const drawStatic = () => {
      if (!ctx || !canvas) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const copperColor = "#c9a880";

      const circle1X = centerX - config.baseDistance;
      const circle2X = centerX + config.baseDistance;
      const circleY = centerY;

      // Draw circles in static position
      ctx.fillStyle = copperColor;

      ctx.beginPath();
      ctx.arc(circle1X, circleY, config.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(circle2X, circleY, config.radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const animate = () => {
      if (!ctx || !canvas) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Calculate circle positions with gravitational pull animation
      let offset = 0;
      if (!prefersReducedMotion) {
        offset = Math.sin(timeRef.current) * (config.radius * 0.67); // Oscillate proportionally
      }

      const circle1X = centerX - config.baseDistance - offset;
      const circle2X = centerX + config.baseDistance + offset;
      const circleY = centerY;

      // Copper color
      const copperColor = "#c9a880";

      // Draw connecting field line
      if (!prefersReducedMotion) {
        const gradient = ctx.createLinearGradient(
          circle1X,
          circleY,
          circle2X,
          circleY,
        );
        gradient.addColorStop(0, copperColor);
        gradient.addColorStop(0.5, "rgba(201, 168, 128, 0.3)");
        gradient.addColorStop(1, copperColor);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = size === "large" ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(circle1X + config.radius, circleY);
        ctx.lineTo(circle2X - config.radius, circleY);
        ctx.stroke();
      }

      // Draw circles
      ctx.fillStyle = copperColor;

      // Circle 1
      ctx.beginPath();
      ctx.arc(circle1X, circleY, config.radius, 0, Math.PI * 2);
      ctx.fill();

      // Circle 2
      ctx.beginPath();
      ctx.arc(circle2X, circleY, config.radius, 0, Math.PI * 2);
      ctx.fill();

      // Update time for animation
      if (!prefersReducedMotion) {
        timeRef.current += 0.03;
      }

      // Only continue animation if hovering
      if (isHovering) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
      }
    };

    if (isHovering) {
      // Start animation loop
      animate();
    } else {
      // Draw static image
      drawStatic();
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [isHovering, config.baseDistance, config.radius, size]);

  return (
    <div
      className={`flex items-center ${config.gap}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex flex-col leading-none">
        <span
          className={`${config.textSize} font-bold text-copper tracking-tight`}
        >
          REALITY
        </span>
        <span
          className={`${config.subtextSize} uppercase tracking-wider text-navy-soft font-medium`}
        >
          Matchmaking
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={config.canvasWidth}
        height={config.canvasHeight}
        className="block"
        aria-label="Reality Matchmaking Logo"
      />
    </div>
  );
}
