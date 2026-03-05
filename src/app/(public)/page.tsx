import LogoCircles from "@/components/layout/LogoCircles";
import HomeCTA from "@/components/layout/HomeCTA";

export default function HomePage() {
  return (
    <section className="mx-auto flex min-h-screen w-full items-center justify-center px-6">
      <div className="flex flex-col items-center gap-12 -mt-16">
        {/* Copy — above the logo */}
        <div className="flex flex-col items-center gap-6 text-center">
          <p
            className="animate-fade-up text-lg tracking-wide text-navy-soft"
            style={{ animationDelay: "0ms" }}
          >
            You were never the problem.
          </p>
          <p
            className="animate-fade-up text-lg tracking-wide text-navy-soft"
            style={{ animationDelay: "180ms" }}
          >
            Swipes don&apos;t spark chemistry.
          </p>
          <p
            className="animate-fade-up text-xl font-bold tracking-wide text-navy -mt-3"
            style={{ animationDelay: "360ms", animationDuration: "0.7s" }}
          >
            Reality does.
          </p>
        </div>

        {/* Logo */}
        <div
          className="animate-fade-up flex flex-col items-center gap-8"
          style={{ animationDelay: "700ms" }}
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

        {/* Auth-aware CTA buttons */}
        <div
          className="animate-fade-up flex flex-col items-center gap-3 w-full max-w-md"
          style={{ animationDelay: "1100ms" }}
        >
          <HomeCTA />
        </div>
      </div>
    </section>
  );
}
