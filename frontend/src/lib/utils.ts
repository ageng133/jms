import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * tailwind-merge has to know the custom M3 utilities from tailwind.config.ts.
 * Without this it reads `text-label-md` as a text color and drops
 * `text-on-primary` (or the other way round).
 */
const M3_TYPE_SCALE = ["display", "headline", "title", "body", "label"].flatMap((role) =>
  ["lg", "md", "sm"].map((size) => `${role}-${size}`)
);

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: M3_TYPE_SCALE }],
      shadow: [{ shadow: ["elevation-1", "elevation-2", "elevation-3", "elevation-4", "elevation-5"] }],
      rounded: [{ rounded: ["m3-xs", "m3-sm", "m3-md", "m3-lg", "m3-xl"] }],
      "rounded-r": [{ "rounded-r": ["m3-xs", "m3-sm", "m3-md", "m3-lg", "m3-xl"] }],
    },
  },
});

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
      colorClass: "text-success bg-success/10 border-success/20",
    };
  }
  if (score >= 75) {
    return {
      label: "Advisories (PASS)",
      variant: "warning",
      colorClass: "text-warning bg-warning/10 border-warning/20",
    };
  }
  return {
    label: "Revisions Required",
    variant: "destructive",
    colorClass: "text-error bg-error/10 border-error/20",
  };
}
