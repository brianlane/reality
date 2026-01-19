import { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-navy focus:border-copper focus:ring-2 focus:ring-copper/20 focus:outline-none transition-colors",
        className,
      )}
      {...props}
    />
  );
}
