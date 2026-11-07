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
import {
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Lock,
  Mail,
  Zap,
  UserCheck,
  User,
  Sparkles,
} from "lucide-react";

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
  const {
    isGoogleModalOpen,
    closeGoogleModal,
    signInWithGoogle,
    signInWithPassword,
    signInAsDemo,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<"demo" | "password" | "google">("demo");
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Email & Password Form State
  const [email, setEmail] = useState("author@jms.org");
  const [password, setPassword] = useState("password123");

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Initialize real Google Identity Services (GSI) when client ID is configured
  useEffect(() => {
    if (!isGoogleModalOpen || !googleClientId || activeTab !== "google") return;

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
              width: 360,
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
  }, [isGoogleModalOpen, googleClientId, activeTab, signInWithGoogle]);

  // 1-Click Demo Sign-In Handler
  async function handleDemoSignIn(role: "AUTHOR" | "EDITOR" | "ADMIN") {
    setLoading(true);
    setLoadingRole(role);
    setError(null);
    try {
      await signInAsDemo(role);
    } catch (err: any) {
      setError(err.message || "Failed to sign in with demo credentials.");
    } finally {
      setLoading(false);
      setLoadingRole(null);
    }
  }

  // Standard Email & Password Sign-In Handler
  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signInWithPassword(cleanEmail, password);
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isGoogleModalOpen} onOpenChange={(open) => !open && closeGoogleModal()}>
      <DialogContent onClose={closeGoogleModal} className="max-w-md p-6">
        <DialogHeader className="space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-2xs">
              <span className="text-xl">⚡</span>
            </div>
            <Badge variant="secondary" className="text-[11px] font-semibold bg-primary/10 text-primary border-primary/20 rounded-full">
              Format Kilat Auth
            </Badge>
          </div>
          <div>
            <DialogTitle className="text-xl font-bold tracking-tight text-on-surface">
              Sign In to Format Kilat
            </DialogTitle>
            <DialogDescription className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              Pilih metode masuk yang Anda inginkan. Tidak memerlukan akun Google untuk mencoba demo.
            </DialogDescription>
          </div>
        </DialogHeader>

        {error && (
          <div className="my-2 p-3 rounded-2xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-error" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-on-surface/[0.04] rounded-2xl my-3 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("demo")}
            className={`py-2 px-3 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "demo"
                ? "bg-surface shadow-xs text-primary font-semibold"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>1-Click Demo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("password")}
            className={`py-2 px-3 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "password"
                ? "bg-surface shadow-xs text-primary font-semibold"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Email/Pass</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("google")}
            className={`py-2 px-3 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "google"
                ? "bg-surface shadow-xs text-primary font-semibold"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <GoogleLogo className="w-3.5 h-3.5" />
            <span>Google SSO</span>
          </button>
        </div>

        {/* TAB 1: 1-CLICK INSTANT DEMO ACCOUNTS */}
        {activeTab === "demo" && (
          <div className="space-y-2.5 my-2">
            <p className="text-[11px] text-on-surface-variant font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Klik salah satu akun demo untuk masuk secara instan tanpa Google:
            </p>

            {/* Author Button */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoSignIn("AUTHOR")}
              className="w-full p-3 rounded-2xl border border-outline-variant bg-on-surface/[0.02] hover:bg-primary/[0.06] hover:border-primary/40 text-left transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
                    <span>Dr. Alice Smith</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                      Author
                    </Badge>
                  </div>
                  <div className="text-[11px] text-on-surface-variant mt-0.5">author@jms.org</div>
                </div>
              </div>
              {loading && loadingRole === "AUTHOR" ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <span className="text-xs font-semibold text-primary opacity-80 group-hover:opacity-100">
                  Masuk →
                </span>
              )}
            </button>

            {/* Editor Button */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoSignIn("EDITOR")}
              className="w-full p-3 rounded-2xl border border-outline-variant bg-on-surface/[0.02] hover:bg-primary/[0.06] hover:border-primary/40 text-left transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
                    <span>Prof. Robert Davis</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-secondary/15 text-secondary border-secondary/20">
                      Editor
                    </Badge>
                  </div>
                  <div className="text-[11px] text-on-surface-variant mt-0.5">editor@jms.org</div>
                </div>
              </div>
              {loading && loadingRole === "EDITOR" ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <span className="text-xs font-semibold text-primary opacity-80 group-hover:opacity-100">
                  Masuk →
                </span>
              )}
            </button>

            {/* Admin Button */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoSignIn("ADMIN")}
              className="w-full p-3 rounded-2xl border border-outline-variant bg-on-surface/[0.02] hover:bg-primary/[0.06] hover:border-primary/40 text-left transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-tertiary/15 text-tertiary flex items-center justify-center group-hover:bg-tertiary group-hover:text-on-tertiary transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
                    <span>Sysadmin JMS</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-tertiary/15 text-tertiary border-tertiary/20">
                      Admin
                    </Badge>
                  </div>
                  <div className="text-[11px] text-on-surface-variant mt-0.5">admin@jms.org</div>
                </div>
              </div>
              {loading && loadingRole === "ADMIN" ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <span className="text-xs font-semibold text-primary opacity-80 group-hover:opacity-100">
                  Masuk →
                </span>
              )}
            </button>
          </div>
        )}

        {/* TAB 2: EMAIL & PASSWORD SIGN-IN */}
        {activeTab === "password" && (
          <form onSubmit={handlePasswordSignIn} className="space-y-3.5 my-2">
            <div className="space-y-1">
              <Label htmlFor="pass-email" className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-on-surface-variant" />
                Email Address
              </Label>
              <Input
                id="pass-email"
                type="email"
                placeholder="author@jms.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-xs rounded-xl border-outline-variant focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="pass-pwd" className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-on-surface-variant" />
                Password
              </Label>
              <Input
                id="pass-pwd"
                type="password"
                placeholder="password123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-xs rounded-xl border-outline-variant focus-visible:ring-primary"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-on-surface/[0.03] border border-outline-variant text-[11px] text-on-surface-variant space-y-1">
              <div className="font-semibold text-on-surface">Default Seed Accounts:</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setEmail("author@jms.org"); setPassword("password123"); }}
                  className="text-primary hover:underline"
                >
                  author@jms.org
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => { setEmail("editor@jms.org"); setPassword("password123"); }}
                  className="text-primary hover:underline"
                >
                  editor@jms.org
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary text-on-primary font-semibold text-xs gap-2 rounded-full shadow-xs active:scale-[0.98] h-10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sign In with Password</span>
                </>
              )}
            </Button>
          </form>
        )}

        {/* TAB 3: GOOGLE SINGLE SIGN-ON */}
        {activeTab === "google" && (
          <div className="space-y-4 my-3">
            {googleClientId ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <div ref={googleBtnRef} className="w-full flex justify-center" />
                <p className="text-[11px] text-on-surface-variant text-center">
                  Gunakan akun Google Workspace kampus atau institusi Anda.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-on-surface space-y-2">
                <div className="font-semibold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  Google OAuth Belum Dikonfigurasi
                </div>
                <p className="text-on-surface-variant text-[11px] leading-relaxed">
                  Kredensial <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> belum dipasang di environment server. Silakan gunakan tab <strong>1-Click Demo</strong> atau <strong>Email/Pass</strong> untuk masuk tanpa Google.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="pt-3 mt-2 border-t border-outline-variant flex items-center justify-between text-[11px] text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            <span>Format Kilat Secure Identity</span>
          </div>
          <span>JMS Foundation</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
