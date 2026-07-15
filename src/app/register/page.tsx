"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PhoneCall,
  User,
  Mail,
  Lock,
  Building,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  Loader2
} from "lucide-react";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !organizationName) {
      setErrorMsg("All registration fields are required.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, organizationName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || "Failed to register organization.");
        return;
      }

      // Redirect to login page on success
      router.push("/login?registered=true");
    } catch (err: any) {
      setErrorMsg("Connection failure. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0,transparent_60%)] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 relative shadow-2xl space-y-6">
        {/* Brand Icon and Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-650/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <PhoneCall size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Create your BoloSetu AI Workspace</h2>
          <p className="text-xs text-slate-400">Establish a new organization and deploy voice telecalling.</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/20 border border-rose-900/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-400 animate-pulse">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Full Name</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-500"><User size={14} /></span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Email Address</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-500"><Mail size={14} /></span>
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

          {/* Organization Name */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Organization / Company Name</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-500"><Building size={14} /></span>
              <input
                type="text"
                required
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-500"><Lock size={14} /></span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
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
                Registering Workspace...
              </>
            ) : (
              <>
                Create Account & Organization
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-500">
            Already registered?{" "}
            <Link href="/login" className="text-indigo-400 font-semibold hover:underline">
              Log in to your account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
