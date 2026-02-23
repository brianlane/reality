import LogoCircles from "@/components/layout/LogoCircles";
import HomeCTA from "@/components/layout/HomeCTA";

export default function HomePage() {
  return (
    <section className="mx-auto flex min-h-screen w-full items-center justify-center px-6">
      <div className="flex flex-col items-center gap-12">
        {/* Logo circles at top */}
        <div className="flex flex-col items-center gap-8">
          <LogoCircles />

          {/* Text below logo */}
          <div className="flex flex-col items-center leading-none">
            <span className="text-6xl font-bold text-copper tracking-tight">
              REALITY
            </span>
            <span className="text-sm uppercase tracking-wider text-navy-soft font-medium mt-2">
              Matchmaking
            </span>
          </div>
        </div>

        {/* Auth-aware CTA buttons */}
        <div className="flex flex-col items-center gap-3 w-full max-w-md">
          <HomeCTA />
        </div>
      </div>
    </section>
  );
}
