"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { GoogleLogo } from "@/components/GoogleAuthModal";
import { useAuth } from "@/context/AuthContext";

interface AuthGateCardProps {
  title?: string;
  description?: string;
  actionText?: string;
}

export function AuthGateCard({
  title = "Google Sign-In Required",
  description = "You must be signed in with your university Google account to run automated pre-submission audits, verify manuscript layout, and store files in Box cloud storage.",
  actionText = "Sign in with Google to Continue",
}: AuthGateCardProps) {
  const { openGoogleModal } = useAuth();

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <Card className="border-slate-200 shadow-md bg-white">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto shadow-xs">
            <GoogleLogo className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
              {title}
            </CardTitle>
            <CardDescription className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              {description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Why Google authentication is required:</span>
            </div>
            <ul className="space-y-1.5 pl-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Prevents unauthorized access to confidential paper drafts</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Enables Google Gemini visual audit and comparison reporting</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Associates Box cloud storage upload tickets with your author ID</span>
              </li>
            </ul>
          </div>

          <Button
            size="lg"
            onClick={openGoogleModal}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-2 shadow-sm"
          >
            <GoogleLogo className="w-4 h-4" />
            <span>{actionText}</span>
          </Button>

          <div className="text-center pt-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Public Overview</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
