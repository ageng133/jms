"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { GoogleAuthModal, GoogleLogo } from "@/components/GoogleAuthModal";
import { Button } from "@/components/ui/button";

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, openGoogleModal } = useAuth();
  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {!isAdminRoute && (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand Logo */}
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-2.5">
                <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  JMS
                </span>
                <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <span>Journal Submission Platform</span>
                  <span className="hidden sm:inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    UTS Edition
                  </span>
                </span>
              </Link>

              <nav className="hidden md:flex items-center space-x-5 text-xs font-medium text-slate-600">
                <Link href="/" className="hover:text-slate-900 transition">
                  Overview
                </Link>
                <a href="#how-it-works" className="hover:text-slate-900 transition">
                  How It Works
                </a>
              </nav>
            </div>

            {/* Auth Action */}
            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 hidden sm:inline-block">
                    Signed in as <strong>{user.full_name}</strong>
                  </span>
                  <Link href="/admin">
                    <Button size="sm" className="text-xs font-semibold">
                      Open Submission Dashboard &rarr;
                    </Button>
                  </Link>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={openGoogleModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm gap-2"
                >
                  <GoogleLogo className="w-3.5 h-3.5" />
                  <span>Sign In with Google</span>
                </Button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${isAdminRoute ? "p-0" : "max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8"}`}>
        {children}
      </main>

      {!isAdminRoute && (
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          Journal Management System (JMS) &bull; University of Technology Sydney (UTS) &bull; Built with Next.js, Go, Box Storage, and Google AI
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
