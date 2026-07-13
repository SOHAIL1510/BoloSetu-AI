"use client";

import React from "react";
import Link from "next/link";
import {
  PhoneCall,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Award,
  Globe2,
  Lock
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden relative">
      {/* Dynamic Grid Background Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

      {/* Background Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Global Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-650 p-2 rounded-xl text-white shadow-lg shadow-indigo-950/50">
              <PhoneCall size={20} className="transform -rotate-12" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase">
                Vani AI
              </h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Telecalling Agent</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900/60 border border-transparent hover:border-slate-800 transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/25 transition-all flex items-center gap-1"
            >
              Get Started
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center space-y-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/30 border border-indigo-900/50 text-[10px] font-bold text-indigo-400 uppercase tracking-widest animate-pulse">
          <Zap size={10} />
          Powered by Sarvam AI & Gemini
        </div>

        <div className="space-y-4 max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-slate-100">
            Indic Voice Telecalling <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Automated at Scale
            </span>
          </h2>
          <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Vani AI is a production-grade multi-tenant SaaS platform that automates outbound lead qualification, demo scheduling, and call auditing using fluent Indian voice agents.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-6 py-3 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-950/50 transition-all flex items-center gap-2"
          >
            Create Your Workspace
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl text-sm font-bold bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 transition-all"
          >
            Access Console
          </Link>
        </div>

        {/* Generated Visual Mockup Asset Showcase */}
        <div className="pt-10 max-w-5xl mx-auto animate-zoom-in">
          <div className="relative p-2.5 bg-slate-900/40 border border-slate-800 rounded-3xl shadow-2xl shadow-indigo-950/15 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 z-10 pointer-events-none"></div>
            <img
              src="/landing_dashboard_preview.png"
              alt="Vani AI Campaign Analytics Dashboard Mockup"
              className="rounded-2xl border border-slate-850/60 w-full object-cover transition-transform duration-700 group-hover:scale-[1.01]"
            />
          </div>
        </div>
      </section>

      {/* Premium Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-900">
        <div className="text-center space-y-2 mb-16">
          <h3 className="text-2xl font-bold text-slate-100 tracking-tight">Enterprise Telecalling Features</h3>
          <p className="text-xs text-slate-400">Everything you need to launch conversational Indic outreach campaigns.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Feature 1 */}
          <div className="p-6 bg-slate-900/50 border border-slate-850/60 rounded-2xl space-y-4 hover:border-slate-800 transition-all group">
            <div className="h-10 w-10 rounded-xl bg-indigo-950 border border-indigo-900 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Globe2 size={18} />
            </div>
            <h4 className="font-bold text-sm text-slate-200">Indic Native Scripts</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Speaks native Hindi, Tamil, Telugu, and other Indic scripts fluently using Sarvam AI voice models without robotic accents.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 bg-slate-900/50 border border-slate-850/60 rounded-2xl space-y-4 hover:border-slate-800 transition-all group">
            <div className="h-10 w-10 rounded-xl bg-purple-950 border border-purple-900 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Activity size={18} />
            </div>
            <h4 className="font-bold text-sm text-slate-200">Async Campaign Dialer</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Throttles outbound dialing queues progressively using Inngest serverless jobs to safeguard lines and maintain call cadence.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 bg-slate-900/50 border border-slate-850/60 rounded-2xl space-y-4 hover:border-slate-800 transition-all group">
            <div className="h-10 w-10 rounded-xl bg-pink-950 border border-pink-900 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
              <Award size={18} />
            </div>
            <h4 className="font-bold text-sm text-slate-200">Gemini Dialogue Audits</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatically creates summaries, qualifies lead scores, and extracts appointment slots directly from call recordings.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 bg-slate-900/50 border border-slate-850/60 rounded-2xl space-y-4 hover:border-slate-800 transition-all group">
            <div className="h-10 w-10 rounded-xl bg-emerald-950 border border-emerald-900 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <ShieldCheck size={18} />
            </div>
            <h4 className="font-bold text-sm text-slate-200">Compliance & BYOK</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fully tenant-isolated security where organizations register and bring their own API keys for Sarvam, Gemini, and Twilio.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center relative">
        <div className="p-12 bg-slate-900 border border-slate-850 rounded-3xl relative overflow-hidden space-y-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06)_0,transparent_60%)] pointer-events-none"></div>
          <h3 className="text-2xl font-extrabold text-slate-100 tracking-tight">Ready to deploy AI voice agents?</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Establish your tenant workspace today and trigger outbound call pipelines instantly.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-650 hover:bg-indigo-600 text-white shadow-lg transition-all"
            >
              Sign Up Free
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-850 text-slate-300 hover:text-white transition-all"
            >
              Access Console
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-[10px] text-slate-600">
        <p>&copy; {new Date().getFullYear()} Vani AI. All rights reserved. Safety compliant outbound Indic telecalling.</p>
      </footer>
    </div>
  );
}
