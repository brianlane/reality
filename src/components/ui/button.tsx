import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline";
};

const variantClasses: Record<string, string> = {
  primary: "bg-navy text-white hover:bg-copper transition-colors",
  secondary: "bg-slate-100 text-navy hover:bg-slate-200 transition-colors",
  outline: "border border-slate-300 text-navy hover:bg-copper hover:text-white transition-colors",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
