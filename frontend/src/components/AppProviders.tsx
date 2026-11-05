"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { GoogleAuthModal, GoogleLogo } from "@/components/GoogleAuthModal";
import { Button } from "@/components/ui/button";

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut, openGoogleModal } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex flex-col antialiased selection:bg-[#0071e3] selection:text-white">
      {!isAdminRoute && (
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-black/[0.06] transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            {/* Brand Logo - Apple Minimalist */}
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-2.5 group">
                <span className="w-7 h-7 rounded-lg bg-[#0071e3] flex items-center justify-center text-xs font-bold text-white shadow-xs group-hover:scale-105 transition-transform">
                  ⚡
                </span>
                <span className="text-sm font-semibold tracking-tight text-[#1d1d1f] flex items-center gap-2">
                  <span>Format Kilat</span>
                  <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/[0.04] text-[#86868b] border border-black/[0.04]">
                    Academic Review
                  </span>
                </span>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center space-x-6 text-xs font-medium text-[#86868b]">
                <Link href="/" className="hover:text-[#1d1d1f] transition-colors">
                  Overview
                </Link>
                <a href="#how-it-works" className="hover:text-[#1d1d1f] transition-colors">
                  How It Works
                </a>
                <Link href="/admin" className="hover:text-[#1d1d1f] transition-colors">
                  Editorial Portal
                </Link>
                <span
                  title="Zero-Configuration Turnkey Architecture: All audit, format evaluation, and local storage engines run out-of-the-box. Add keys to .env to activate live Google Gemini & Box Cloud sync."
                  className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#34c759]/10 text-[#34c759] border border-[#34c759]/20 text-[10px] font-semibold tracking-tight cursor-default select-none"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse" />
                  <span>⚡ Turnkey Ready</span>
                </span>
              </nav>
            </div>

            {/* Desktop Auth Actions */}
            <div className="hidden sm:flex items-center space-x-3">
              {user ? (
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/[0.04] text-xs">
                    <span className="w-2 h-2 rounded-full bg-[#34c759]" />
                    <span className="text-[#1d1d1f] font-medium truncate max-w-[140px]">
                      {user.full_name}
                    </span>
                    <span className="text-[10px] text-[#86868b] uppercase font-semibold">
                      {user.role}
                    </span>
                  </div>

                  <Link href="/admin">
                    <button className="h-8 px-3.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium shadow-xs transition active:scale-[0.98] flex items-center gap-1.5">
                      <span>Dashboard</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </Link>

                  <button
                    onClick={signOut}
                    title="Sign Out"
                    className="h-8 w-8 rounded-full border border-black/[0.08] hover:bg-black/[0.05] text-[#86868b] hover:text-[#1d1d1f] flex items-center justify-center transition active:scale-[0.98]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={openGoogleModal}
                  className="h-8 px-4 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium shadow-xs transition active:scale-[0.98] flex items-center gap-2"
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

          {/* Mobile Sheet Navigation (Apple iOS Style) */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t border-black/[0.06] bg-white/95 backdrop-blur-2xl px-5 py-4 space-y-4 animate-in slide-in-from-top duration-200">
              <nav className="space-y-2 text-sm font-medium">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-[#1d1d1f] hover:bg-black/[0.04] transition"
                >
                  Overview
                </Link>
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-[#1d1d1f] hover:bg-black/[0.04] transition"
                >
                  How It Works
                </a>
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-[#1d1d1f] hover:bg-black/[0.04] transition"
                >
                  Editorial Portal
                </Link>
              </nav>

              <div className="pt-3 border-t border-black/[0.06]">
                {user ? (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-black/[0.03] space-y-1">
                      <div className="text-xs font-semibold text-[#1d1d1f]">{user.full_name}</div>
                      <div className="text-[11px] text-[#86868b]">{user.email} &bull; {user.role}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full text-center py-2.5 rounded-full bg-[#0071e3] text-white text-xs font-medium shadow-xs"
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          signOut();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full py-2.5 rounded-full border border-black/[0.08] text-xs font-medium text-[#1d1d1f] hover:bg-black/[0.04]"
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
                    className="w-full py-2.5 rounded-full bg-[#0071e3] text-white text-xs font-medium shadow-xs flex items-center justify-center gap-2"
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
