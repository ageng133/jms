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
  title = "Authentication Required",
  description = "Silakan masuk untuk menjalankan audit format manuskrip otomatis, memeriksa kepatuhan IEEE/Springer, dan menyimpan file di Box cloud storage.",
  actionText = "Sign In / 1-Click Demo Login",
}: AuthGateCardProps) {
  const { openGoogleModal } = useAuth();

  return (
    <div className="max-w-md mx-auto py-8 sm:py-16 px-4">
      <Card className="border border-outline-variant shadow-elevation-1 bg-surface-container-low rounded-3xl overflow-hidden">
        <CardHeader className="text-center space-y-3 pb-4 pt-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mx-auto shadow-xs text-2xl">
            ⚡
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-xl font-bold tracking-tight text-on-surface">
              {title}
            </CardTitle>
            <CardDescription className="text-xs text-on-surface-variant leading-relaxed max-w-sm mx-auto">
              {description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 px-6 pb-6">
          <div className="p-4 rounded-2xl bg-on-surface/[0.03] border border-outline-variant space-y-2.5 text-xs text-on-surface">
            <div className="font-semibold text-on-surface flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Keuntungan masuk ke Format Kilat:</span>
            </div>
            <ul className="space-y-2 text-on-surface-variant">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                <span>Penyimpanan aman manuskrip dan draft jurnal di Box Enterprise</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                <span>Audit layout multimodal instan dengan Gemini 3.5 Flash AI</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                <span>Download camera-ready PDF dengan format double-blind otomatis</span>
              </li>
            </ul>
          </div>

          <Button
            size="lg"
            onClick={openGoogleModal}
            className="w-full bg-primary hover:bg-primary text-on-primary font-semibold text-xs gap-2 rounded-full shadow-xs active:scale-[0.98] transition-transform"
          >
            <span>{actionText}</span>
          </Button>

          <div className="text-center pt-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition"
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

