import type { Metadata } from "next";
import { AppProviders } from "@/components/AppProviders";
import { themeInitScript } from "@/context/ThemeContext";
import "./globals.css";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-surface text-on-surface flex flex-col antialiased font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
