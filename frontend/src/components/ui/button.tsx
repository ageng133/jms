import * as React from "react";
import { cn } from "@/lib/utils";

// Re-exported: several components import `cn` from here.
export { cn };

/**
 * M3 common buttons: filled, tonal, outlined, text, elevated, plus an
 * error-colored filled button. The older names (default, secondary,
 * outline, ghost, destructive) are kept as aliases.
 */
export type ButtonVariant =
  | "filled"
  | "tonal"
  | "outlined"
  | "text"
  | "elevated"
  | "error"
  | "link"
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const filled = "bg-primary text-on-primary hover:shadow-elevation-1";
const tonal = "bg-secondary-container text-on-secondary-container hover:shadow-elevation-1";
const outlined = "border border-outline text-primary";
const text = "text-primary";
const error = "bg-error text-on-error hover:shadow-elevation-1";

const variantClasses: Record<ButtonVariant, string> = {
  filled,
  tonal,
  outlined,
  text,
  elevated: "bg-surface-container-low text-primary shadow-elevation-1 hover:shadow-elevation-2",
  error,
  link: "text-primary underline-offset-4 hover:underline before:hidden",
  default: filled,
  secondary: tonal,
  outline: outlined,
  ghost: text,
  destructive: error,
};

const sizeClasses = {
  default: "h-10 px-6 text-label-lg",
  sm: "h-8 px-4 text-label-md",
  lg: "h-12 px-8 text-label-lg",
  icon: "h-10 w-10 p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "filled", size = "default", asChild: _asChild, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "state-layer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium select-none",
        "transition-[box-shadow,background-color,color] duration-200 ease-standard",
        "disabled:pointer-events-none disabled:opacity-[0.38] disabled:shadow-none",
        "[&_svg]:shrink-0",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "standard" | "filled" | "tonal" | "outlined";
  size?: "sm" | "default";
}

const iconVariantClasses = {
  standard: "text-on-surface-variant",
  filled: "bg-primary text-on-primary",
  tonal: "bg-secondary-container text-on-secondary-container",
  outlined: "border border-outline text-on-surface-variant",
};

/** M3 icon button (40px target, 24px icon). */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "standard", size = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "state-layer inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-200 ease-standard",
        "disabled:pointer-events-none disabled:opacity-[0.38]",
        size === "sm" ? "h-8 w-8" : "h-10 w-10",
        iconVariantClasses[variant],
        className
      )}
      {...props}
    />
  )
);
IconButton.displayName = "IconButton";
