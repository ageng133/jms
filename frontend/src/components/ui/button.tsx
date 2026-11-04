import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-full text-xs font-medium tracking-tight transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 select-none";

    const variants = {
      default:
        "bg-[#0071e3] text-white shadow-xs hover:bg-[#0077ed] active:bg-[#0062c4]",
      destructive:
        "bg-[#ff3b30] text-white shadow-xs hover:bg-[#e03429] active:bg-[#c92a20]",
      outline:
        "border border-black/[0.12] bg-white text-[#1d1d1f] hover:bg-black/[0.03] active:bg-black/[0.06] shadow-2xs",
      secondary:
        "bg-black/[0.05] text-[#1d1d1f] hover:bg-black/[0.08] active:bg-black/[0.12]",
      ghost:
        "text-[#1d1d1f] hover:bg-black/[0.05] hover:text-[#1d1d1f]",
      link:
        "text-[#0071e3] underline-offset-4 hover:underline",
    };

    const sizes = {
      default: "h-9 px-4 py-2",
      sm: "h-7.5 rounded-full px-3 text-[11px]",
      lg: "h-11 rounded-full px-6 text-sm font-semibold",
      icon: "h-8.5 w-8.5 rounded-full",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
