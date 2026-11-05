import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          blue: "#0071e3",
          blueHover: "#0077ed",
          canvas: "#f5f5f7",
          surface: "#ffffff",
          label: "#1d1d1f",
          secondary: "#86868b",
          tertiary: "#a1a1a6",
          green: "#34c759",
          orange: "#ff9500",
          red: "#ff3b30",
          purple: "#af52de",
        },
        academic: {
          50: "#f0f4f8",
          100: "#d9e2ec",
          200: "#bcccdc",
          500: "#334e68",
          700: "#102a43",
          900: "#0b1b2b",
        },
        zilenial: {
          indigo: "#6366f1",
          violet: "#8b5cf6",
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
          cyan: "#06b6d4",
          fuchsia: "#d946ef",
          dark: "#0a0b10",
          surface: "#12151f",
          elevated: "#1a1e2e",
          border: "rgba(255, 255, 255, 0.08)",
        },
      },
      boxShadow: {
        "apple-card": "0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)",
        "apple-hover": "0 12px 32px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03)",
        "apple-dropdown": "0 10px 30px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)",
        "glow-indigo": "0 0 30px -4px rgba(99, 102, 241, 0.35)",
        "glow-violet": "0 0 30px -4px rgba(139, 92, 246, 0.35)",
        "glow-emerald": "0 0 30px -4px rgba(16, 185, 129, 0.35)",
        "glow-rose": "0 0 30px -4px rgba(244, 63, 94, 0.35)",
        "glow-cyan": "0 0 30px -4px rgba(6, 182, 212, 0.35)",
        "glow-amber": "0 0 30px -4px rgba(245, 158, 11, 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;

