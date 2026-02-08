export function CopperIcon({ d }: { d: string }) {
  return (
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-copper">
      <svg
        className="h-10 w-10 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    </div>
  );
}
