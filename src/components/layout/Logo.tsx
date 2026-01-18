"use client";

import { useEffect, useRef } from "react";

export default function Logo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let animationFrameId: number;
    let time = 0;

    const animate = () => {
      if (!ctx || !canvas) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseDistance = 12;

      // Calculate circle positions with gravitational pull animation
      let offset = 0;
      if (!prefersReducedMotion) {
        offset = Math.sin(time) * 4; // Oscillate +/- 4px
      }

      const circle1X = centerX - baseDistance - offset;
      const circle2X = centerX + baseDistance + offset;
      const circleY = centerY;
      const radius = 6;

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
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(circle1X + radius, circleY);
        ctx.lineTo(circle2X - radius, circleY);
        ctx.stroke();
      }

      // Draw circles
      ctx.fillStyle = copperColor;

      // Circle 1
      ctx.beginPath();
      ctx.arc(circle1X, circleY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Circle 2
      ctx.beginPath();
      ctx.arc(circle2X, circleY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Update time for animation
      if (!prefersReducedMotion) {
        time += 0.03;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col leading-none">
        <span className="text-2xl font-bold text-copper tracking-tight">
          REALITY
        </span>
        <span className="text-[10px] uppercase tracking-wider text-navy-soft font-medium">
          Matchmaking
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={48}
        height={40}
        className="block"
        aria-label="Reality Matchmaking Logo"
      />
    </div>
  );
}
