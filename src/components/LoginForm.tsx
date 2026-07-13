"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  PhoneCall,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ShieldAlert,
  CheckCircle,
  Loader2
} from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setRegisteredSuccess(true);
    }
    const authError = searchParams.get("error");
    if (authError) {
      if (authError === "CredentialsSignin") {
        setErrorMsg("Invalid email or password. Please try again.");
      } else {
        setErrorMsg("Authentication failed. Please check your credentials.");
      }
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      setRegisteredSuccess(false);

      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setErrorMsg("Invalid work email or password.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setErrorMsg("Network connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 relative shadow-2xl space-y-6">
      {/* Brand Icon and Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-650/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <PhoneCall size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-100 tracking-tight">Log in to Vani AI</h2>
        <p className="text-xs text-slate-400">Access your organization campaign and call logs.</p>
      </div>

      {/* Success registration banner */}
      {registeredSuccess && (
        <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/60 rounded-xl flex items-start gap-2.5 text-xs text-emerald-400">
          <CheckCircle size={16} className="mt-0.5 shrink-0" />
          <span>Organization registered successfully! Log in with your credentials.</span>
        </div>
      )}

      {/* Error notification banner */}
      {errorMsg && (
        <div className="p-3 bg-rose-950/20 border border-rose-900/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-400">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Email</label>
          <div className="relative">
            <span className="absolute left-3.5 top-3.5 text-slate-500"><Mail size={14} /></span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@company.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
          <div className="relative">
            <span className="absolute left-3.5 top-3.5 text-slate-500"><Lock size={14} /></span>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Logging in...
            </>
          ) : (
            <>
              Access Dashboard
              <LogIn size={14} />
            </>
          )}
        </button>
      </form>

      <div className="text-center pt-2">
        <p className="text-[11px] text-slate-550">
          Don't have a workspace?{" "}
          <Link href="/register" className="text-indigo-400 font-semibold hover:underline">
            Create an organization
          </Link>
        </p>
      </div>
    </div>
  );
}
