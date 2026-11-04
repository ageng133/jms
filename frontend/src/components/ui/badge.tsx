import * as React from "react";
import { cn } from "./button";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning"
    | "info";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants = {
    default:
      "border-[#0071e3]/20 bg-[#0071e3]/10 text-[#0071e3] border",
    secondary:
      "border-black/[0.06] bg-black/[0.04] text-[#1d1d1f] border",
    destructive:
      "border-[#ff3b30]/20 bg-[#ff3b30]/10 text-[#ff3b30] border",
    outline: "text-[#1d1d1f] border border-black/[0.1] bg-white",
    success:
      "border-[#34c759]/25 bg-[#34c759]/10 text-[#1f883d] border",
    warning:
      "border-[#ff9500]/25 bg-[#ff9500]/10 text-[#b45309] border",
    info: "border-[#5856d6]/20 bg-[#5856d6]/10 text-[#5856d6] border",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors select-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
