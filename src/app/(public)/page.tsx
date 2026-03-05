"use client";

import { useEffect, useState } from "react";
import LogoCircles from "@/components/layout/LogoCircles";
import HomeCTA from "@/components/layout/HomeCTA";

export default function HomePage() {
  const [reduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const [logoIn, setLogoIn] = useState(reduceMotion);
  const [contentIn, setContentIn] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) return;

    const t1 = setTimeout(() => setLogoIn(true), 300);
    const t2 = setTimeout(() => setContentIn(true), 1100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduceMotion]);

  return (
    <section className="mx-auto flex min-h-screen w-full flex-col items-center justify-center px-6">
      {/* Logo — fades in first, alone at center */}
      <div
        className="flex flex-col items-center gap-8"
        style={{
          opacity: logoIn ? 1 : 0,
          transition: "opacity 0.9s ease-out",
        }}
      >
        <LogoCircles />
        <div className="flex flex-col items-center leading-none">
          <span className="text-6xl font-bold text-copper tracking-tight">
            REALITY
          </span>
          <span className="text-sm uppercase tracking-wider text-navy-soft font-medium mt-2">
            Matchmaking
          </span>
        </div>
      </div>

      {/* Copy + Buttons — expands below, pushing logo upward */}
      <div
        style={{
          maxHeight: contentIn ? "400px" : "0",
          opacity: contentIn ? 1 : 0,
          overflow: "hidden",
          marginTop: contentIn ? "3rem" : "0",
          transition:
            "max-height 0.9s ease-out, opacity 0.7s ease-out, margin-top 0.9s ease-out",
        }}
      >
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-lg tracking-wide text-navy-soft">
            You were never the problem.
          </p>
          <p className="text-lg tracking-wide text-navy-soft">
            Swipes don&apos;t spark chemistry.
          </p>
          <p className="text-xl font-bold tracking-wide text-navy -mt-3">
            Reality does.
          </p>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 w-full max-w-md">
          <HomeCTA />
        </div>
      </div>
    </section>
  );
}
