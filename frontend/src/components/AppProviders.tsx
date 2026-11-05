"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, ArrowRight, ShieldCheck, Sparkles, Box } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { GoogleAuthModal, GoogleLogo } from "@/components/GoogleAuthModal";
import { Button } from "@/components/ui/button";

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut, openGoogleModal } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-indigo-600 selection:text-white">
      {!isAdminRoute && (
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/85 border-b border-indigo-100/60 shadow-xs transition-all">
          {/* Subtle Top Aurora Accent Line */}
          <div className="h-[2.5px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-full" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            {/* Brand Logo - Vibrant Zilenial */}
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-2.5 group">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                  ⚡
                </span>
                <span className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <span className="gradient-text-aurora">Format Kilat</span>
                  <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    Academic AI Lab
                  </span>
                </span>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-600">
                <Link href="/" className="hover:text-indigo-600 transition-colors">
                  Overview
                </Link>
                <a href="/#ai-copilot" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                  <span>AI Copilot</span>
                </a>
                <a href="/#virtual-office" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-indigo-500" />
                  <span>3D Lab</span>
                </a>
                <a href="/#how-it-works" className="hover:text-indigo-600 transition-colors">
                  How It Works
                </a>
                <Link href="/admin" className="hover:text-indigo-600 transition-colors">
                  Editorial Portal
                </Link>
                <span
                  title="Zero-Configuration Turnkey Architecture: All audit, format evaluation, and local storage engines run out-of-the-box. Add keys to .env to activate live Google Gemini & Box Cloud sync."
                  className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[10px] font-bold tracking-tight cursor-default select-none shadow-xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>⚡ Turnkey Ready</span>
                </span>
              </nav>
            </div>

            {/* Desktop Auth Actions */}
            <div className="hidden sm:flex items-center space-x-3">
              {user ? (
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-800 font-medium truncate max-w-[140px]">
                      {user.full_name}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">
                      {user.role}
                    </span>
                  </div>

                  <Link href="/admin">
                    <button className="h-8 px-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition active:scale-[0.98] flex items-center gap-1.5">
                      <span>Dashboard</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </Link>

                  <button
                    onClick={signOut}
                    title="Sign Out"
                    className="h-8 w-8 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition active:scale-[0.98]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={openGoogleModal}
                  className="h-8 px-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition active:scale-[0.98] flex items-center gap-2"
                >
                  <GoogleLogo className="w-3.5 h-3.5" />
                  <span>Sign In with Google</span>
                </button>
              )}
            </div>

            {/* Mobile Hamburger Toggle Button */}
            <div className="sm:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#1d1d1f] hover:bg-black/[0.05] transition"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Sheet Navigation (Vibrant Zilenial Style) */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t border-indigo-100 bg-white/95 backdrop-blur-2xl px-5 py-4 space-y-4 animate-in slide-in-from-top duration-200">
              <nav className="space-y-1.5 text-sm font-semibold">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition"
                >
                  Overview
                </Link>
                <a
                  href="/#ai-copilot"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 transition"
                >
                  <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                  <span>AI Copilot (Interactive)</span>
                </a>
                <a
                  href="/#virtual-office"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition"
                >
                  <Box className="w-4 h-4 text-indigo-500" />
                  <span>3D Autonomous AI Lab</span>
                </a>
                <a
                  href="/#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition"
                >
                  How It Works
                </a>
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition"
                >
                  Editorial Portal
                </Link>
              </nav>

              <div className="pt-3 border-t border-slate-200">
                {user ? (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="text-xs font-bold text-slate-900">{user.full_name}</div>
                      <div className="text-[11px] text-slate-500">{user.email} &bull; {user.role}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full text-center py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          signOut();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full py-2.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openGoogleModal();
                    }}
                    className="w-full py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                  >
                    <GoogleLogo className="w-3.5 h-3.5" />
                    <span>Sign In with Google</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${isAdminRoute ? "p-0" : "max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10"}`}>
        {children}
      </main>

      {!isAdminRoute && (
        <footer className="border-t border-black/[0.06] bg-white/60 py-6 text-center text-xs text-[#86868b]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              Journal Management System (JMS) &bull; University of Technology Sydney (UTS)
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[#a1a1a6]">
              <span>Box Cloud Storage</span>
              <span>&bull;</span>
              <span>Google Gemini AI</span>
              <span>&bull;</span>
              <span>Apple HIG Responsive</span>
            </div>
          </div>
        </footer>
      )}

      {/* Global Google SSO Modal */}
      <GoogleAuthModal />
    </div>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
