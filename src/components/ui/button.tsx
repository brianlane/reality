import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline";
};

const variantClasses: Record<string, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
  outline: "border border-slate-300 text-slate-700 hover:bg-slate-50",
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
