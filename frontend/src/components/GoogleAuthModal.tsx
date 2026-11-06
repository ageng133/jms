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
import { ShieldCheck, AlertCircle, Loader2, CheckCircle2, ChevronDown, Building2, User, Mail } from "lucide-react";

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

// RFC 5322 Compliant Email Validation Regex
const RFC_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function GoogleAuthModal() {
  const { isGoogleModalOpen, closeGoogleModal, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enterprise Academic Credentials Form State
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"AUTHOR" | "ADMIN">("AUTHOR");
  const [customAffiliation, setCustomAffiliation] = useState("");

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const isDevMode = process.env.NODE_ENV === "development";
  // The e-mail form is the demo (unverified) login. It must match AUTH_DEMO_LOGIN
  // on the gateway; set NEXT_PUBLIC_DEMO_LOGIN=false in production.
  const demoLoginEnabled = process.env.NEXT_PUBLIC_DEMO_LOGIN !== "false";

  // Derive academic affiliation dynamically from email domain
  const detectedAffiliation = React.useMemo(() => {
    if (customAffiliation.trim()) return customAffiliation.trim();
    const lower = email.toLowerCase();
    if (lower.includes("uts.edu.au")) return "University of Technology Sydney (UTS)";
    if (lower.includes("mit.edu")) return "Massachusetts Institute of Technology (MIT)";
    if (lower.includes("stanford.edu")) return "Stanford University";
    if (lower.includes("harvard.edu")) return "Harvard University";
    if (lower.includes("ox.ac.uk")) return "University of Oxford";
    if (lower.includes("cam.ac.uk")) return "University of Cambridge";
    if (lower.includes("ui.ac.id")) return "Universitas Indonesia";
    if (lower.includes("itb.ac.id")) return "Institut Teknologi Bandung";
    if (lower.includes("ugm.ac.id")) return "Universitas Gadjah Mada";
    if (lower.includes(".edu")) return "Higher Education & Research Institution";
    if (lower.includes(".ac.")) return "Academic Research Institution";
    return "Independent Academic Researcher";
  }, [email, customAffiliation]);

  // Initialize real Google Identity Services (GSI) when client ID is configured
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

  async function handleEnterpriseSignIn(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanName = fullName.trim();

    if (!cleanEmail) {
      setError("Please enter your academic or institutional Google email.");
      return;
    }

    if (!RFC_EMAIL_REGEX.test(cleanEmail)) {
      setError("Please enter a valid RFC-compliant email address (e.g., name@university.edu).");
      return;
    }

    if (!cleanName || cleanName.length < 2) {
      setError("Please enter your full name and academic title.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle({
        email: cleanEmail,
        full_name: cleanName,
        role,
        affiliation: detectedAffiliation,
      });
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with academic credentials.");
    } finally {
      setLoading(false);
    }
  }

  // Developer mode simulation helper
  async function applyDevSandboxIdentity(devRole: "AUTHOR" | "ADMIN") {
    const devEmail = devRole === "ADMIN" ? "editor.google@uts.edu.au" : "author.google@uts.edu.au";
    const devName = devRole === "ADMIN" ? "Prof. Dr. Sarah Connor" : "Dr. Alexander Wright";
    setEmail(devEmail);
    setFullName(devName);
    setRole(devRole);
    setCustomAffiliation("University of Technology Sydney (UTS)");
  }

  return (
    <Dialog open={isGoogleModalOpen} onOpenChange={(open) => !open && closeGoogleModal()}>
      <DialogContent onClose={closeGoogleModal} className="max-w-md">
        <DialogHeader className="space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-on-surface/[0.03] border border-outline-variant flex items-center justify-center shadow-2xs">
              <GoogleLogo className="w-6 h-6" />
            </div>
            <Badge variant="secondary" className="text-[11px] font-semibold bg-primary/10 text-primary border-primary/20 rounded-full">
              Format Kilat SSO
            </Badge>
          </div>
          <div>
            <DialogTitle className="text-xl font-bold tracking-tight text-on-surface">
              Sign in with Google
            </DialogTitle>
            <DialogDescription className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              Authenticate using your Google Workspace or university credentials to run automated pre-submission compliance audits.
            </DialogDescription>
          </div>
        </DialogHeader>

        {error && (
          <div className="my-3 p-3.5 rounded-2xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-error" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Real Google GSI Button Container if NEXT_PUBLIC_GOOGLE_CLIENT_ID exists */}
        {googleClientId && (
          <div className="my-3 flex flex-col items-center gap-2">
            <div ref={googleBtnRef} className="w-full flex justify-center" />
            {demoLoginEnabled && (
            <div className="flex items-center gap-2 w-full my-1">
              <div className="flex-1 h-px bg-on-surface/[0.06]" />
              <span className="text-[11px] uppercase font-semibold text-on-surface-variant">Or continue with email</span>
              <div className="flex-1 h-px bg-on-surface/[0.06]" />
            </div>
            )}
          </div>
        )}

        {!googleClientId && !demoLoginEnabled && (
          <div className="my-3 p-3.5 rounded-2xl bg-warning-container text-on-warning-container text-xs">
            Google sign-in is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID (frontend) and GOOGLE_CLIENT_ID (gateway).
          </div>
        )}

        {/* Standard Enterprise Academic Sign-In Form (demo login) */}
        {demoLoginEnabled && (
        <form onSubmit={handleEnterpriseSignIn} className="space-y-3.5 mt-2">
          <div className="space-y-1">
            <Label htmlFor="auth-email" className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-on-surface-variant" />
              Institutional / Google Email
            </Label>
            <Input
              id="auth-email"
              type="email"
              placeholder="author.research@uts.edu.au or @gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-xs rounded-xl border-outline-variant focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="auth-name" className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-on-surface-variant" />
              Full Name &amp; Academic Title
            </Label>
            <Input
              id="auth-name"
              placeholder="e.g. Dr. Alexander Wright, Senior Lecturer"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="text-xs rounded-xl border-outline-variant focus-visible:ring-primary"
            />
          </div>

          {/* Dynamic Affiliation Resolution Pill */}
          <div className="p-3 rounded-2xl bg-on-surface/[0.02] border border-outline-variant flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-on-surface-variant shrink-0" />
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase font-semibold text-on-surface-variant">Detected Affiliation</div>
                <div className="font-medium text-on-surface text-xs truncate max-w-[220px]">
                  {detectedAffiliation}
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px] text-primary bg-primary/10">
              Auto-detected
            </Badge>
          </div>

          {/* Role Selection */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-on-surface">Journal Desk Access Role</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("AUTHOR")}
                className={`py-2 px-3 rounded-xl border text-left text-xs transition-all ${
                  role === "AUTHOR"
                    ? "border-primary bg-primary/5 text-primary font-semibold shadow-2xs"
                    : "border-outline-variant hover:bg-on-surface/[0.02] text-on-surface-variant"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>Author</span>
                  {role === "AUTHOR" && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                </div>
                <div className="text-[10px] text-on-surface-variant font-normal mt-0.5">Submissions &amp; Audits</div>
              </button>

              <button
                type="button"
                onClick={() => setRole("ADMIN")}
                className={`py-2 px-3 rounded-xl border text-left text-xs transition-all ${
                  role === "ADMIN"
                    ? "border-primary bg-primary/5 text-primary font-semibold shadow-2xs"
                    : "border-outline-variant hover:bg-on-surface/[0.02] text-on-surface-variant"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>Managing Editor</span>
                  {role === "ADMIN" && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                </div>
                <div className="text-[10px] text-on-surface-variant font-normal mt-0.5">Desk Review Portal</div>
              </button>
            </div>
            <p className="text-[10px] text-on-surface-variant">
              Editor access is granted by the server (ADMIN_EMAILS / EDITOR_EMAILS); other accounts sign in as Author.
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary text-on-primary font-semibold text-xs gap-2 mt-2 rounded-full shadow-xs active:scale-[0.98] h-10"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Authenticating Credentials...</span>
              </>
            ) : (
              <>
                <GoogleLogo className="w-4 h-4" />
                <span>Continue with Academic Single Sign-On</span>
              </>
            )}
          </Button>
        </form>
        )}

        {/* Developer Sandbox Options: Strictly sequestered and collapsible, visible in dev only */}
        {isDevMode && demoLoginEnabled && (
          <details className="mt-4 pt-3 border-t border-outline-variant text-xs group">
            <summary className="cursor-pointer text-[11px] font-medium text-on-surface-variant hover:text-on-surface flex items-center justify-between transition-colors">
              <span>Developer Sandbox Diagnostics (Local Dev Only)</span>
              <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="pt-2.5 pb-1 space-y-2">
              <p className="text-[10px] text-on-surface-variant">
                Auto-fill standard test identities into the form above to verify multi-role workflows without manual typing:
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => applyDevSandboxIdentity("AUTHOR")}
                  className="flex-1 py-1.5 px-2.5 rounded-lg border border-outline-variant bg-on-surface/[0.02] hover:bg-on-surface/[0.05] text-[11px] font-medium text-on-surface transition"
                >
                  Fill Author Identity
                </button>
                <button
                  type="button"
                  onClick={() => applyDevSandboxIdentity("ADMIN")}
                  className="flex-1 py-1.5 px-2.5 rounded-lg border border-outline-variant bg-on-surface/[0.02] hover:bg-on-surface/[0.05] text-[11px] font-medium text-on-surface transition"
                >
                  Fill Editor Identity
                </button>
              </div>
            </div>
          </details>
        )}

        <div className="pt-3 mt-2 border-t border-outline-variant flex items-center justify-between text-[11px] text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            <span>OAuth 2.0 / OpenID Connect Enterprise</span>
          </div>
          <span>University of Technology Sydney</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
