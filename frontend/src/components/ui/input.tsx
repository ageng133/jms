import * as React from "react";
import { cn } from "./button";

/*
 * M3 outlined text field (compact density). The border turns primary and
 * 2px thick on focus; aria-invalid switches it to the error color.
 */
const fieldClasses = [
  "w-full rounded-m3-xs border border-outline bg-transparent px-4 text-body-md text-on-surface",
  "placeholder:text-on-surface-variant/70",
  "hover:border-on-surface",
  "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary",
  "aria-[invalid=true]:border-error aria-[invalid=true]:ring-error",
  "disabled:cursor-not-allowed disabled:opacity-[0.38]",
  "transition-colors duration-150 ease-standard",
].join(" ");

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input type={type} className={cn("flex h-10", fieldClasses, className)} ref={ref} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea className={cn("flex min-h-[96px] py-3", fieldClasses, className)} ref={ref} {...props} />
));
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("mb-1.5 block select-none text-label-lg text-on-surface-variant", className)}
    {...props}
  />
));
Label.displayName = "Label";
