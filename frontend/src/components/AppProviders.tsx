"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, ArrowRight, Sparkles } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { GoogleAuthModal, GoogleLogo } from "@/components/GoogleAuthModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button, IconButton, cn } from "@/components/ui/button";

interface NavLinkItem {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const NAV_LINKS: NavLinkItem[] = [
  { href: "/", label: "Overview" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/admin", label: "Editorial Portal" },
];

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut, openGoogleModal } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col antialiased">
      {!isAdminRoute && (
        // M3 small top app bar: surface color, turns surface-container on scroll-like elevation.
        <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-6 min-w-0">
              <Link href="/" className="flex items-center gap-3 shrink-0 whitespace-nowrap">
                <span className="w-9 h-9 rounded-m3-md bg-primary-container text-on-primary-container flex items-center justify-center text-base">
                  ⚡
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-title-lg font-medium text-on-surface">Format Kilat</span>
                  <span className="hidden xl:inline-flex items-center h-6 px-2 rounded-m3-sm bg-secondary-container text-on-secondary-container text-label-sm">
                    Academic AI Lab
                  </span>
                </span>
              </Link>

              <nav className="hidden lg:flex items-center gap-1 min-w-0 overflow-hidden">
                {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                  const active = href === "/" ? pathname === "/" : pathname?.startsWith(href) && !href.includes("#");
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "state-layer inline-flex items-center gap-1.5 h-10 px-3 rounded-full text-label-lg whitespace-nowrap transition-colors",
                        active ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant"
                      )}
                    >
                      {Icon && <Icon className="w-4 h-4" />}
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <ThemeToggle />
              {user ? (
                <>
                  <div className="hidden xl:flex items-center gap-2 h-8 pl-2 pr-3 rounded-m3-sm border border-outline-variant text-label-md whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-on-surface truncate max-w-[160px]">{user.full_name}</span>
                    <span className="text-on-surface-variant uppercase">{user.role}</span>
                  </div>
                  <Link href="/admin">
                    <Button size="sm">
                      <span>Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <IconButton onClick={signOut} title="Sign Out" aria-label="Sign Out">
                    <LogOut className="w-5 h-5" />
                  </IconButton>
                </>
              ) : (
                <Button size="sm" onClick={openGoogleModal}>
                  <GoogleLogo className="w-4 h-4" />
                  <span>Sign In with Google</span>
                </Button>
              )}
            </div>

            <div className="lg:hidden flex items-center gap-1">
              <ThemeToggle />
              <IconButton
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </IconButton>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden animate-in slide-in-from-top border-t border-outline-variant bg-surface-container-low px-3 py-3 space-y-3">
              <nav className="space-y-1">
                {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="state-layer flex items-center gap-3 h-14 px-4 rounded-full text-label-lg text-on-surface-variant"
                  >
                    {Icon && <Icon className="w-5 h-5" />}
                    <span>{label}</span>
                  </Link>
                ))}
              </nav>

              <div className="pt-3 border-t border-outline-variant px-1">
                {user ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-m3-md bg-surface-container space-y-0.5">
                      <div className="text-title-sm text-on-surface">{user.full_name}</div>
                      <div className="text-body-sm text-on-surface-variant">
                        {user.email} &bull; {user.role}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                        <Button className="w-full">Dashboard</Button>
                      </Link>
                      <Button
                        variant="outlined"
                        className="w-full"
                        onClick={() => {
                          signOut();
                          setMobileMenuOpen(false);
                        }}
                      >
                        Sign Out
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openGoogleModal();
                    }}
                  >
                    <GoogleLogo className="w-4 h-4" />
                    <span>Sign In with Google</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </header>
      )}

      <main className={`flex-1 ${isAdminRoute ? "p-0" : "max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10"}`}>
        {children}
      </main>

      {!isAdminRoute && (
        <footer className="border-t border-outline-variant bg-surface-container-low py-6 text-body-sm text-on-surface-variant">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center">
            <div>
              Format Kilat &bull; Journal Management System (JMS) &bull; University of Technology Sydney (UTS)
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-label-sm text-outline">
              <span
                title="Zero-Configuration Turnkey Architecture: All audit, format evaluation, and local storage engines run out-of-the-box. Add keys to .env to activate live Google Gemini & Box Cloud sync."
                className="inline-flex items-center gap-1.5 h-6 px-2 rounded-m3-sm whitespace-nowrap bg-success-container text-on-success-container cursor-default select-none"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <span>Turnkey Ready</span>
              </span>
              <span>Box Cloud Storage</span>
              <span>&bull;</span>
              <span>PyMuPDF Audit Engine</span>
              <span>&bull;</span>
              <span>Material Design 3</span>
            </div>
          </div>
        </footer>
      )}

      <GoogleAuthModal />
    </div>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell>{children}</AppShell>
      </AuthProvider>
    </ThemeProvider>
  );
}
