"use client";

import { useEffect, useRef, useState } from "react";

export default function LogoCircles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const isHoveringRef = useRef(false);
  const animationFrameIdRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const finishCycleRef = useRef(false);
  const startAnimationRef = useRef<(() => void) | null>(null);

  // Canvas configuration
  const canvasWidth = 120;
  const canvasHeight = 100;
  const baseDistance = 30;
  const radius = 15;

  // Update refs when hover state changes
  useEffect(() => {
    isHoveringRef.current = isHovering;
    if (isHovering) {
      finishCycleRef.current = false;
      startAnimationRef.current?.();
    } else if (isAnimatingRef.current) {
      finishCycleRef.current = true;
    }
  }, [isHovering]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawStatic = () => {
      if (!ctx || !canvas) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const copperColor = "#c9a880";

      const circle1X = centerX - baseDistance;
      const circle2X = centerX + baseDistance;
      const circleY = centerY;

      // Draw gradient line (static)
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
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(circle1X + radius, circleY);
      ctx.lineTo(circle2X - radius, circleY);
      ctx.stroke();

      // Draw circles in static position
      ctx.fillStyle = copperColor;

      ctx.beginPath();
      ctx.arc(circle1X, circleY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(circle2X, circleY, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    // Draw initial static image
    drawStatic();

    return () => {
      // Cleanup on unmount
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      isAnimatingRef.current = false;
    };
  }, [baseDistance, radius]);

  // Animation setup
  useEffect(() => {
    if (!canvasRef.current) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const offset = Math.sin(timeRef.current) * (radius * 0.67);

      const circle1X = centerX - baseDistance - offset;
      const circle2X = centerX + baseDistance + offset;
      const circleY = centerY;
      const copperColor = "#c9a880";

      // Draw gradient line
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
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(circle1X + radius, circleY);
      ctx.lineTo(circle2X - radius, circleY);
      ctx.stroke();

      // Draw circles
      ctx.fillStyle = copperColor;
      ctx.beginPath();
      ctx.arc(circle1X, circleY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(circle2X, circleY, radius, 0, Math.PI * 2);
      ctx.fill();

      timeRef.current += 0.03;

      // Continue until we reach the true rest position after hover ends
      const restThreshold = Math.max(0.15, radius * 0.05);
      const atRestPosition = Math.abs(offset) < restThreshold;

      if (!finishCycleRef.current || !atRestPosition) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
        return;
      }

      // Stop and draw static
      finishCycleRef.current = false;
      isAnimatingRef.current = false;
      animationFrameIdRef.current = null;

      // Draw static version
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const staticCircle1X = centerX - baseDistance;
      const staticCircle2X = centerX + baseDistance;

      const staticGradient = ctx.createLinearGradient(
        staticCircle1X,
        circleY,
        staticCircle2X,
        circleY,
      );
      staticGradient.addColorStop(0, copperColor);
      staticGradient.addColorStop(0.5, "rgba(201, 168, 128, 0.3)");
      staticGradient.addColorStop(1, copperColor);
      ctx.strokeStyle = staticGradient;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(staticCircle1X + radius, circleY);
      ctx.lineTo(staticCircle2X - radius, circleY);
      ctx.stroke();

      ctx.fillStyle = copperColor;
      ctx.beginPath();
      ctx.arc(staticCircle1X, circleY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(staticCircle2X, circleY, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const startAnimation = () => {
      if (prefersReducedMotion || isAnimatingRef.current) return;
      isAnimatingRef.current = true;
      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    startAnimationRef.current = startAnimation;
    if (isHoveringRef.current) {
      startAnimationRef.current();
    }

    // Cleanup: cancel animation if component unmounts or dependencies change
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      startAnimationRef.current = null;
      isAnimatingRef.current = false;
      finishCycleRef.current = false;
    };
  }, [baseDistance, radius]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="block cursor-pointer"
      aria-label="Reality Matchmaking Logo"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    />
  );
}
