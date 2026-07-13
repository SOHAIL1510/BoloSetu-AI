"use client";

import React, { Suspense } from "react";
import LoginForm from "@/components/LoginForm";
import { Loader2 } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0,transparent_60%)] pointer-events-none"></div>

      <Suspense
        fallback={
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-xs text-slate-450">Loading Vani AI...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
