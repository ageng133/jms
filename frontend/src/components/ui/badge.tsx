import * as React from "react";
import { cn } from "./button";

/**
 * Status chip in the M3 style: 8px corners, label typography and a
 * container color pair for each tone.
 */
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

const variants = {
  default: "bg-primary-container text-on-primary-container",
  secondary: "bg-surface-container-high text-on-surface-variant",
  destructive: "bg-error-container text-on-error-container",
  outline: "border border-outline-variant text-on-surface-variant",
  success: "bg-success-container text-on-success-container",
  warning: "bg-warning-container text-on-warning-container",
  info: "bg-tertiary-container text-on-tertiary-container",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-m3-sm px-2.5 py-0.5 text-label-md select-none [&_svg]:shrink-0",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
