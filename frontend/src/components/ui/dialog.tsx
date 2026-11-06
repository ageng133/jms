import * as React from "react";
import { X } from "lucide-react";
import { cn } from "./button";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    }
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="animate-in fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="fixed inset-0 bg-scrim/[0.32] transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div role="dialog" aria-modal="true" className="relative z-50 w-full max-w-lg">
        {children}
      </div>
    </div>
  );
}

/** M3 basic dialog surface: 28px corners, surface-container-high, elevation 3. */
export function DialogContent({
  className,
  children,
  onClose,
}: {
  className?: string;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative rounded-m3-xl bg-surface-container-high p-6 text-on-surface shadow-elevation-3",
        className
      )}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="state-layer absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
      )}
      {children}
    </div>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col space-y-4 text-left", className)} {...props} />;
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("flex items-center gap-2 text-headline-sm text-on-surface", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-body-md text-on-surface-variant", className)} {...props} />;
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}
