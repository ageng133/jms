import type { Config } from "tailwindcss";

/*
 * Material Design 3 tokens. Colors read the CSS variables defined in
 * src/app/globals.css, so every utility (bg-primary, text-on-surface, ...)
 * switches automatically between light and dark schemes.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "rgb(var(--md-primary) / <alpha-value>)",
        "on-primary": "rgb(var(--md-on-primary) / <alpha-value>)",
        "primary-container": "rgb(var(--md-primary-container) / <alpha-value>)",
        "on-primary-container": "rgb(var(--md-on-primary-container) / <alpha-value>)",
        "secondary": "rgb(var(--md-secondary) / <alpha-value>)",
        "on-secondary": "rgb(var(--md-on-secondary) / <alpha-value>)",
        "secondary-container": "rgb(var(--md-secondary-container) / <alpha-value>)",
        "on-secondary-container": "rgb(var(--md-on-secondary-container) / <alpha-value>)",
        "tertiary": "rgb(var(--md-tertiary) / <alpha-value>)",
        "on-tertiary": "rgb(var(--md-on-tertiary) / <alpha-value>)",
        "tertiary-container": "rgb(var(--md-tertiary-container) / <alpha-value>)",
        "on-tertiary-container": "rgb(var(--md-on-tertiary-container) / <alpha-value>)",
        "error": "rgb(var(--md-error) / <alpha-value>)",
        "on-error": "rgb(var(--md-on-error) / <alpha-value>)",
        "error-container": "rgb(var(--md-error-container) / <alpha-value>)",
        "on-error-container": "rgb(var(--md-on-error-container) / <alpha-value>)",
        "success": "rgb(var(--md-success) / <alpha-value>)",
        "on-success": "rgb(var(--md-on-success) / <alpha-value>)",
        "success-container": "rgb(var(--md-success-container) / <alpha-value>)",
        "on-success-container": "rgb(var(--md-on-success-container) / <alpha-value>)",
        "warning": "rgb(var(--md-warning) / <alpha-value>)",
        "on-warning": "rgb(var(--md-on-warning) / <alpha-value>)",
        "warning-container": "rgb(var(--md-warning-container) / <alpha-value>)",
        "on-warning-container": "rgb(var(--md-on-warning-container) / <alpha-value>)",
        "surface": "rgb(var(--md-surface) / <alpha-value>)",
        "surface-dim": "rgb(var(--md-surface-dim) / <alpha-value>)",
        "surface-bright": "rgb(var(--md-surface-bright) / <alpha-value>)",
        "surface-container-lowest": "rgb(var(--md-surface-container-lowest) / <alpha-value>)",
        "surface-container-low": "rgb(var(--md-surface-container-low) / <alpha-value>)",
        "surface-container": "rgb(var(--md-surface-container) / <alpha-value>)",
        "surface-container-high": "rgb(var(--md-surface-container-high) / <alpha-value>)",
        "surface-container-highest": "rgb(var(--md-surface-container-highest) / <alpha-value>)",
        "on-surface": "rgb(var(--md-on-surface) / <alpha-value>)",
        "on-surface-variant": "rgb(var(--md-on-surface-variant) / <alpha-value>)",
        "outline": "rgb(var(--md-outline) / <alpha-value>)",
        "outline-variant": "rgb(var(--md-outline-variant) / <alpha-value>)",
        "inverse-surface": "rgb(var(--md-inverse-surface) / <alpha-value>)",
        "inverse-on-surface": "rgb(var(--md-inverse-on-surface) / <alpha-value>)",
        "inverse-primary": "rgb(var(--md-inverse-primary) / <alpha-value>)",
        "scrim": "rgb(var(--md-scrim) / <alpha-value>)",
        "shadow": "rgb(var(--md-shadow) / <alpha-value>)",
      },
      // M3 type scale: [size, { lineHeight, letterSpacing, fontWeight }]
      fontSize: {
        "display-lg": ["57px", { lineHeight: "64px", letterSpacing: "-0.25px", fontWeight: "400" }],
        "display-md": ["45px", { lineHeight: "52px", letterSpacing: "0px", fontWeight: "400" }],
        "display-sm": ["36px", { lineHeight: "44px", letterSpacing: "0px", fontWeight: "400" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "0px", fontWeight: "400" }],
        "headline-md": ["28px", { lineHeight: "36px", letterSpacing: "0px", fontWeight: "400" }],
        "headline-sm": ["24px", { lineHeight: "32px", letterSpacing: "0px", fontWeight: "400" }],
        "title-lg": ["22px", { lineHeight: "28px", letterSpacing: "0px", fontWeight: "400" }],
        "title-md": ["16px", { lineHeight: "24px", letterSpacing: "0.15px", fontWeight: "500" }],
        "title-sm": ["14px", { lineHeight: "20px", letterSpacing: "0.1px", fontWeight: "500" }],
        "body-lg": ["16px", { lineHeight: "24px", letterSpacing: "0.5px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", letterSpacing: "0.25px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.4px", fontWeight: "400" }],
        "label-lg": ["14px", { lineHeight: "20px", letterSpacing: "0.1px", fontWeight: "500" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.5px", fontWeight: "500" }],
        "label-sm": ["11px", { lineHeight: "16px", letterSpacing: "0.5px", fontWeight: "500" }],
      },
      // M3 shape scale
      borderRadius: {
        "m3-xs": "4px",
        "m3-sm": "8px",
        "m3-md": "12px",
        "m3-lg": "16px",
        "m3-xl": "28px",
      },
      // M3 elevation levels 1-5 (shadow part; surfaces carry the tonal part)
      boxShadow: {
        "elevation-1": "0 1px 2px 0 rgb(0 0 0 / 0.3), 0 1px 3px 1px rgb(0 0 0 / 0.15)",
        "elevation-2": "0 1px 2px 0 rgb(0 0 0 / 0.3), 0 2px 6px 2px rgb(0 0 0 / 0.15)",
        "elevation-3": "0 1px 3px 0 rgb(0 0 0 / 0.3), 0 4px 8px 3px rgb(0 0 0 / 0.15)",
        "elevation-4": "0 2px 3px 0 rgb(0 0 0 / 0.3), 0 6px 10px 4px rgb(0 0 0 / 0.15)",
        "elevation-5": "0 4px 4px 0 rgb(0 0 0 / 0.3), 0 8px 12px 6px rgb(0 0 0 / 0.15)",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        emphasized: "cubic-bezier(0.2, 0, 0, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
