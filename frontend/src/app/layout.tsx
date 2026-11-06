import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { AppProviders } from "@/components/AppProviders";
import { themeInitScript } from "@/context/ThemeContext";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Format Kilat - AI Academic Paper Review Platform",
  description: "Fast Automated Academic Paper Formatting & Compliance Pre-Check",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: the init script adds `dark` before hydration.
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-surface text-on-surface flex flex-col antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
