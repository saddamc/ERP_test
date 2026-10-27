"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  Briefcase,
  Award,
  ArrowRight,
  LogOut,
  Sparkles,
} from "lucide-react";
import { loginAction, autoLoginAction } from "@/server/actions/auth.actions";
import { UserSession } from "@/server/auth/auth.service";

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: UserSession) => void;
  currentUser?: UserSession | null;
}

export function LoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser,
}: LoginModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e?: React.FormEvent, customUser?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    const targetUsername = customUser || username;
    const targetPassword = customPassword ?? password;

    if (!targetUsername.trim()) {
      setFeedback({ type: "error", message: "Please enter your username." });
      return;
    }
    if (!targetPassword) {
      setFeedback({ type: "error", message: "Please enter your password." });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const res = await loginAction({
        username: targetUsername,
        password: targetPassword,
      });

      if (res.success && res.user) {
        setFeedback({ type: "success", message: res.message });
        setTimeout(() => {
          onLoginSuccess(res.user!);
          if (onClose) onClose();
        }, 400);
      } else {
        setFeedback({ type: "error", message: res.message });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to authenticate.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Instant 1-click auto-login for frictionless customer review
  const handleAutoLogin = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await autoLoginAction();
      if (res.success && res.user) {
        setFeedback({ type: "success", message: res.message });
        setTimeout(() => {
          onLoginSuccess(res.user!);
          if (onClose) onClose();
        }, 300);
      } else {
        setFeedback({ type: "error", message: res.message });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to auto-sign in." });
    } finally {
      setLoading(false);
    }
  };

  // Sign in as a seeded demo user (seed password "pass123").
  const handleQuickPersona = (roleUser: string) => {
    setUsername(roleUser);
    setPassword("pass123");
    handleLogin(undefined, roleUser, "pass123");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 text-center relative">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur border border-white/20 mb-3 shadow-inner">
            <Building2 className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Uttara Recreation Club Ltd.</h2>
          <p className="text-xs text-slate-300 mt-1">
            Club ERP & Executive Role-Based Authentication Portal
          </p>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg text-xs hover:bg-white/10 transition-colors"
            >
              ✕ Close
            </button>
          )}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 text-xs font-semibold ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* 1-Click Instant Demo Access Button for Customer Review */}
          <button
            type="button"
            onClick={handleAutoLogin}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-emerald-900/20 hover:shadow-lg transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur">
                <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold leading-tight">Instant Customer Demo Access</div>
                <div className="text-[10px] text-emerald-100 font-normal">Explore full ERP with auto-login (No password required)</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Quick-Access Executive Roles Section */}
          {process.env.NEXT_PUBLIC_DISABLE_DEMO_LOGIN !== "true" && (<>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                1-Click Executive Access (Demo Personas)
              </span>
              <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Instant Sign-In
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* President */}
              <button
                type="button"
                onClick={() => handleQuickPersona("president")}
                disabled={loading}
                className="flex items-start gap-3 p-3 text-left rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 hover:border-amber-300 transition-all group disabled:opacity-50"
              >
                <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0 group-hover:scale-105 transition-transform">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    President
                    <ArrowRight className="w-3 h-3 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Solvency, approvals & governance
                  </div>
                </div>
              </button>

              {/* Secretary */}
              <button
                type="button"
                onClick={() => handleQuickPersona("secretary")}
                disabled={loading}
                className="flex items-start gap-3 p-3 text-left rounded-xl border border-sky-200 bg-sky-50/50 hover:bg-sky-100/60 hover:border-sky-300 transition-all group disabled:opacity-50"
              >
                <div className="p-2 rounded-lg bg-sky-600 text-white shrink-0 group-hover:scale-105 transition-transform">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    Secretary
                    <ArrowRight className="w-3 h-3 text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Census, family records & notices
                  </div>
                </div>
              </button>

              {/* Finance Director */}
              <button
                type="button"
                onClick={() => handleQuickPersona("finance")}
                disabled={loading}
                className="flex items-start gap-3 p-3 text-left rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/60 hover:border-indigo-300 transition-all group disabled:opacity-50"
              >
                <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    Finance Officer
                    <ArrowRight className="w-3 h-3 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Vouchers, GL & liquidity
                  </div>
                </div>
              </button>

              {/* System Admin */}
              <button
                type="button"
                onClick={() => handleQuickPersona("admin")}
                disabled={loading}
                className="flex items-start gap-3 p-3 text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all group disabled:opacity-50"
              >
                <div className="p-2 rounded-lg bg-slate-700 text-white shrink-0 group-hover:scale-105 transition-transform">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    Administrator
                    <ArrowRight className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    System setup & database
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[10px] uppercase font-bold tracking-wider text-slate-400 absolute">
              Or Sign In With Username
            </span>
          </div>
          </>)}

          {/* Form Credentials */}
          <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username / System ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. president, secretary, finance, admin"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating with PostgreSQL...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Secure Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Audit Trail Security Notice */}
          <div className="pt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>All login sessions are logged to PostgreSQL AuditLog with timestamp & IP.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
