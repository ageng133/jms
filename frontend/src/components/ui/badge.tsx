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
      "border-indigo-200 bg-indigo-50 text-indigo-700 border",
    secondary:
      "border-slate-200 bg-slate-100 text-slate-700 border",
    destructive:
      "border-rose-200 bg-rose-50 text-rose-700 border",
    outline: "text-slate-700 border border-slate-300 bg-white",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-700 border",
    warning:
      "border-amber-200 bg-amber-50 text-amber-700 border",
    info: "border-blue-200 bg-blue-50 text-blue-700 border",
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
