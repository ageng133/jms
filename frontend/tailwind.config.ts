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
        academic: {
          50: "#f0f4f8",
          100: "#d9e2ec",
          200: "#bcccdc",
          500: "#334e68",
          700: "#102a43",
          900: "#0b1b2b",
        },
      },
    },
  },
  plugins: [],
};
export default config;
