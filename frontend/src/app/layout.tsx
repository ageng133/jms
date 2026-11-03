import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "JMS - Journal Management System with AI Pre-Submission Engine",
  description: "Automated manuscript layout, double-blind anonymization and citation crosscheck engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-sm font-black">
                    JMS
                  </span>
                  <span>Journal Control Plane</span>
                </span>
              </Link>
              <nav className="hidden md:flex space-x-6 text-sm font-medium text-slate-300">
                <Link href="/submissions" className="hover:text-white transition">Submissions</Link>
                <Link href="/submissions/new" className="hover:text-white transition">New Submission</Link>
                <Link href="/admin" className="hover:text-white transition flex items-center gap-1.5 text-indigo-300 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  Admin Panel
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="hidden sm:inline-block text-xs px-2.5 py-1 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                AI Pre-Check: Active
              </span>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
              >
                Editorial Portal
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          Journal Management System (JMS) &bull; Automated AI Pre-Submission Engine &bull; Phase 0 Bootstrap
        </footer>
      </body>
    </html>
  );
}

