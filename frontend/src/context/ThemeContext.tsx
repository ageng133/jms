"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "fk-theme";

interface ThemeContextValue {
  /** What the user picked. */
  mode: ThemeMode;
  /** What is actually on screen after resolving "system". */
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  /** Flips between light and dark (leaves "system"). */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStoredMode(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // storage blocked: fall through to system
  }
  return "system";
}

function apply(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

/**
 * Runs before React hydrates (inlined in <head>) so the page never flashes
 * the wrong scheme. Keep it in sync with readStoredMode/apply above.
 */
export const themeInitScript = `(function(){try{var m=localStorage.getItem("${STORAGE_KEY}");var d=m==="dark"||((!m||m==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d)r.classList.add("dark");r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Pick up the stored choice after mount (the init script already painted it).
  useEffect(() => {
    const stored = readStoredMode();
    setModeState(stored);
    setResolved(stored === "system" ? (systemPrefersDark() ? "dark" : "light") : stored);
  }, []);

  // Follow the OS while in "system" mode.
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = mq.matches ? "dark" : "light";
      setResolved(next);
      apply(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore: choice just won't persist
    }
    const r = next === "system" ? (systemPrefersDark() ? "dark" : "light") : next;
    setResolved(r);
    apply(r);
  }, []);

  const toggle = useCallback(() => {
    setMode(resolved === "dark" ? "light" : "dark");
  }, [resolved, setMode]);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
