"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogIn, UserCheck, ShieldCheck } from "lucide-react";
import { getCurrentUser, loginWithGoogle } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
  }, [pathname]);

  async function handleGoogleSignIn(role: "AUTHOR" | "ADMIN") {
    setAuthLoading(true);
    try {
      const email =
        role === "ADMIN"
          ? "editor.google@uts.edu.au"
          : "author.google@uts.edu.au";
      const fullName =
        role === "ADMIN" ? "Prof. Dr. Sarah Connor" : "Dr. Alexander Wright";

      const res = await loginWithGoogle({
        email,
        full_name: fullName,
        role: role,
        affiliation: "UTS Faculty of Engineering & IT",
      });

      setUser(res.user);
      setGoogleModalOpen(false);
      router.push("/admin");
    } catch (err: any) {
      alert("Sign-in error: " + err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  // If in admin route, we let the Admin Panel provide its own dedicated full-height Sidebar + Header shell!
  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
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
                  <a
                    href="#how-it-works"
                    className="hover:text-slate-900 transition"
                  >
                    How It Works
                  </a>
                </nav>
              </div>

              {/* Auth Button */}
              <div className="flex items-center space-x-3">
                {user ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 hidden sm:inline-block">
                      Signed in as <strong>{user.full_name}</strong>
                    </span>
                    <Link href="/admin">
                      <Button size="sm" className="text-xs font-semibold">
                        Open Admin Dashboard &rarr;
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setGoogleModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
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

        {/* GOOGLE SIGN-IN MODAL */}
        <Dialog open={googleModalOpen} onOpenChange={setGoogleModalOpen}>
          <DialogContent onClose={() => setGoogleModalOpen(false)}>
            <DialogHeader>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-2">
                <UserCheck className="w-5 h-5" />
              </div>
              <DialogTitle>Sign in with Google</DialogTitle>
              <DialogDescription>
                Choose an academic role to sign in and open your submission dashboard:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 my-2">
              <button
                onClick={() => handleGoogleSignIn("AUTHOR")}
                disabled={authLoading}
                className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition flex items-center justify-between group"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <span>Author Account</span>
                    <Badge variant="secondary" className="text-[10px]">
                      Submit Papers
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500">
                    Dr. Alexander Wright &bull; author.google@uts.edu.au
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                  Sign in &rarr;
                </span>
              </button>

              <button
                onClick={() => handleGoogleSignIn("ADMIN")}
                disabled={authLoading}
                className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition flex items-center justify-between group"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <span>Managing Editor Account</span>
                    <Badge variant="default" className="text-[10px]">
                      Triage & Review
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500">
                    Prof. Dr. Sarah Connor &bull; editor.google@uts.edu.au
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                  Sign in &rarr;
                </span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400">
              University of Technology Sydney (UTS) &bull; Single Sign-On
            </div>
          </DialogContent>
        </Dialog>
      </body>
    </html>
  );
}
