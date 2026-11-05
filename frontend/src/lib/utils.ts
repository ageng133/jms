import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind classes safely with clsx and twMerge.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Converts millimeters to PDF points (72 pt / inch, 25.4 mm / inch).
 */
export function mmToPoints(mm: number): number {
  return (mm * 72.0) / 25.4;
}

/**
 * Converts PDF points to millimeters.
 */
export function pointsToMm(pt: number): number {
  return (pt * 25.4) / 72.0;
}

/**
 * Formats ISO date string into human-readable Apple-style date.
 */
export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Returns Apple-styled badge styling and label based on compliance score.
 */
export function getComplianceBadge(score: number): {
  label: string;
  variant: "success" | "warning" | "destructive";
  colorClass: string;
} {
  if (score >= 90) {
    return {
      label: "Camera-Ready (PASS)",
      variant: "success",
      colorClass: "text-[#34c759] bg-[#34c759]/10 border-[#34c759]/20",
    };
  }
  if (score >= 75) {
    return {
      label: "Advisories (PASS)",
      variant: "warning",
      colorClass: "text-[#ff9500] bg-[#ff9500]/10 border-[#ff9500]/20",
    };
  }
  return {
    label: "Revisions Required",
    variant: "destructive",
    colorClass: "text-[#ff3b30] bg-[#ff3b30]/10 border-[#ff3b30]/20",
  };
}
