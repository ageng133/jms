"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  getCurrentUser,
  getStoredToken,
  loginWithGoogle as apiLoginWithGoogle,
  logout as apiLogout,
  GoogleLoginPayload,
} from "@/lib/api";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  affiliation?: string;
  orcid_id?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isGoogleModalOpen: boolean;
  openGoogleModal: () => void;
  closeGoogleModal: () => void;
  signInWithGoogle: (payload: GoogleLoginPayload) => Promise<{ token: string; user: UserProfile }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const refreshAuth = useCallback(() => {
    const storedUser = getCurrentUser();
    const storedToken = getStoredToken();
    setUser(storedUser);
    setToken(storedToken);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshAuth();

    function handleAuthChanged() {
      refreshAuth();
    }

    function handleAuthRequired() {
      refreshAuth();
      setIsGoogleModalOpen(true);
    }

    window.addEventListener("jms:auth-changed", handleAuthChanged);
    window.addEventListener("jms:auth-required", handleAuthRequired);
    window.addEventListener("storage", handleAuthChanged);

    return () => {
      window.removeEventListener("jms:auth-changed", handleAuthChanged);
      window.removeEventListener("jms:auth-required", handleAuthRequired);
      window.removeEventListener("storage", handleAuthChanged);
    };
  }, [refreshAuth]);

  const openGoogleModal = useCallback(() => setIsGoogleModalOpen(true), []);
  const closeGoogleModal = useCallback(() => setIsGoogleModalOpen(false), []);

  const signInWithGoogle = useCallback(async (payload: GoogleLoginPayload) => {
    const data = await apiLoginWithGoogle(payload);
    setUser(data.user);
    setToken(data.token);
    setIsGoogleModalOpen(false);
    return data;
  }, []);

  const signOut = useCallback(() => {
    apiLogout();
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        isGoogleModalOpen,
        openGoogleModal,
        closeGoogleModal,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
