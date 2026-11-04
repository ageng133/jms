import * as React from "react";
import { cn } from "./button";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-xl border border-black/[0.12] bg-white px-3.5 py-1.5 text-xs text-[#1d1d1f] placeholder:text-[#86868b] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0071e3]/20 focus-visible:border-[#0071e3] disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-2xs",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full rounded-xl border border-black/[0.12] bg-white px-3.5 py-2.5 text-xs text-[#1d1d1f] placeholder:text-[#86868b] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0071e3]/20 focus-visible:border-[#0071e3] disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-2xs leading-relaxed",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-xs font-semibold text-[#1d1d1f] select-none block mb-1.5 tracking-tight",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";
