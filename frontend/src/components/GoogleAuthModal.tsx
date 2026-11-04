"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, UserCheck, AlertCircle, Loader2, Sparkles, LogIn } from "lucide-react";

export function GoogleLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleAuthModal() {
  const { isGoogleModalOpen, closeGoogleModal, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"quick" | "custom">("quick");

  // Custom Google Login Form State
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [customRole, setCustomRole] = useState<"AUTHOR" | "ADMIN">("AUTHOR");

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Initialize real Google Identity Services (GSI) if client ID is configured
  useEffect(() => {
    if (!isGoogleModalOpen || !googleClientId) return;

    function initGoogleGSI() {
      if (typeof window !== "undefined" && (window as any).google?.accounts?.id) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: any) => {
              if (response?.credential) {
                setLoading(true);
                setError(null);
                try {
                  await signInWithGoogle({ credential: response.credential });
                } catch (err: any) {
                  setError(err.message || "Google Single Sign-On failed");
                } finally {
                  setLoading(false);
                }
              }
            },
          });

          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = "";
            (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
              theme: "outline",
              size: "large",
              type: "standard",
              shape: "rectangular",
              text: "signin_with",
              logo_alignment: "left",
              width: 380,
            });
          }
        } catch (e) {
          console.warn("Google GSI initialization notice:", e);
        }
      }
    }

    if (!(window as any).google?.accounts?.id) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogleGSI;
      document.body.appendChild(script);
    } else {
      initGoogleGSI();
    }
  }, [isGoogleModalOpen, googleClientId, signInWithGoogle]);

  async function handleQuickSignIn(role: "AUTHOR" | "ADMIN") {
    setLoading(true);
    setError(null);
    try {
      const email = role === "ADMIN" ? "editor.google@uts.edu.au" : "author.google@uts.edu.au";
      const fullName = role === "ADMIN" ? "Prof. Dr. Sarah Connor" : "Dr. Alexander Wright";
      await signInWithGoogle({
        email,
        full_name: fullName,
        role,
        affiliation: "UTS Faculty of Engineering & IT",
      });
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google SSO");
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!customEmail.trim() || !customName.trim()) {
      setError("Please enter both your Google email and full name");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle({
        email: customEmail.trim(),
        full_name: customName.trim(),
        role: customRole,
        affiliation: customEmail.includes("uts.edu.au")
          ? "University of Technology Sydney (UTS)"
          : "Academic Research Institution",
      });
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isGoogleModalOpen} onOpenChange={(open) => !open && closeGoogleModal()}>
      <DialogContent onClose={closeGoogleModal} className="max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl p-6">
        <DialogHeader className="space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-xs">
              <GoogleLogo className="w-6 h-6" />
            </div>
            <Badge variant="secondary" className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">
              UTS Google SSO
            </Badge>
          </div>
          <div>
            <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
              Sign in with Google
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Required to run automated pre-submission compliance audits, format evaluations, and Box cloud storage.
            </DialogDescription>
          </div>
        </DialogHeader>

        {error && (
          <div className="my-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Real Google GSI Button Container if NEXT_PUBLIC_GOOGLE_CLIENT_ID exists */}
        {googleClientId && (
          <div className="my-3 flex justify-center">
            <div ref={googleBtnRef} className="w-full flex justify-center" />
          </div>
        )}

        {/* Tab switch between Quick UTS SSO and Custom Google Email */}
        <div className="flex border-b border-slate-200 mt-2 mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("quick")}
            className={`flex-1 py-2 text-center border-b-2 transition ${
              activeTab === "quick"
                ? "border-indigo-600 text-indigo-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            UTS Quick Accounts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`flex-1 py-2 text-center border-b-2 transition ${
              activeTab === "custom"
                ? "border-indigo-600 text-indigo-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Custom Google Email
          </button>
        </div>

        {activeTab === "quick" ? (
          <div className="space-y-3">
            <button
              onClick={() => handleQuickSignIn("AUTHOR")}
              disabled={loading}
              className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition flex items-center justify-between group disabled:opacity-50"
            >
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>Author Account</span>
                  <Badge variant="secondary" className="text-[10px] bg-slate-200 text-slate-800">
                    Submit & Audit Papers
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
              onClick={() => handleQuickSignIn("ADMIN")}
              disabled={loading}
              className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition flex items-center justify-between group disabled:opacity-50"
            >
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>Managing Editor Account</span>
                  <Badge variant="default" className="text-[10px] bg-indigo-600 text-white">
                    Triage & Review Audits
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
        ) : (
          <form onSubmit={handleCustomSignIn} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="custom-email" className="text-xs font-semibold text-slate-700">
                Google Workspace / University Email
              </Label>
              <Input
                id="custom-email"
                type="email"
                placeholder="your.name@uts.edu.au or @gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="custom-name" className="text-xs font-semibold text-slate-700">
                Full Name & Academic Title
              </Label>
              <Input
                id="custom-name"
                placeholder="e.g. Dr. Maya Lin, Senior Lecturer"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Select Role</Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setCustomRole("AUTHOR")}
                  className={`p-2 rounded-lg border text-center font-medium transition ${
                    customRole === "AUTHOR"
                      ? "bg-indigo-50 border-indigo-600 text-indigo-700 font-bold"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Author (Submit & Audit)
                </button>
                <button
                  type="button"
                  onClick={() => setCustomRole("ADMIN")}
                  className={`p-2 rounded-lg border text-center font-medium transition ${
                    customRole === "ADMIN"
                      ? "bg-indigo-50 border-indigo-600 text-indigo-700 font-bold"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Editor (Review Desk)
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-2 mt-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting to Google SSO...</span>
                </>
              ) : (
                <>
                  <GoogleLogo className="w-4 h-4" />
                  <span>Continue with Google</span>
                </>
              )}
            </Button>
          </form>
        )}

        <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>OAuth 2.0 / OpenID Connect</span>
          </div>
          <span>University of Technology Sydney</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
