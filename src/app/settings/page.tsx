"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Save,
  Key,
  Volume2,
  CheckCircle,
  Eye,
  EyeOff,
  Smartphone,
  Check,
  XCircle,
  RefreshCw
} from "lucide-react";

export default function Settings() {
  // API Keys States
  const [sarvamApiKey, setSarvamApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  
  // Twilio Telephony States
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState("");
  const [publicWebhookUrl, setPublicWebhookUrl] = useState("");

  // Plivo Telephony States
  const [plivoAuthId, setPlivoAuthId] = useState("");
  const [plivoAuthToken, setPlivoAuthToken] = useState("");
  const [plivoPhoneNumber, setPlivoPhoneNumber] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-3.1-flash-lite");

  // Default campaign parameters
  const [defaultVoiceId, setDefaultVoiceId] = useState("meera");
  const [defaultLanguage, setDefaultLanguage] = useState("en-IN");
  
  // Visual masking eye toggles
  const [showSarvam, setShowSarvam] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showTwilioSid, setShowTwilioSid] = useState(false);
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [showPlivoId, setShowPlivoId] = useState(false);
  const [showPlivoToken, setShowPlivoToken] = useState(false);

  // Testing indicators
  const [testingTarget, setTestingTarget] = useState<string | null>(null);
  const [testStatuses, setTestStatuses] = useState<Record<string, { success: boolean; message: string }>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load existing settings
  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSarvamApiKey(data.sarvamApiKey || "");
        setGeminiApiKey(data.geminiApiKey || "");
        setOpenaiApiKey(data.openaiApiKey || "");
        setTwilioAccountSid(data.twilioAccountSid || "");
        setTwilioAuthToken(data.twilioAuthToken || "");
        setTwilioPhoneNumber(data.twilioPhoneNumber || "");
        setPublicWebhookUrl(data.publicWebhookUrl || "");
        setPlivoAuthId(data.plivoAuthId || "");
        setPlivoAuthToken(data.plivoAuthToken || "");
        setPlivoPhoneNumber(data.plivoPhoneNumber || "");
        setGeminiModel(data.geminiModel || "gemini-3.1-flash-lite");
        setDefaultVoiceId(data.defaultVoiceId || "meera");
        setDefaultLanguage(data.defaultLanguage || "en-IN");
      }
    } catch (err) {
      console.error("Error loading system settings:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  // Run Connection Tests
  async function testConnection(target: "gemini" | "sarvam" | "twilio" | "plivo") {
    try {
      setTestingTarget(target);
      const payload: Record<string, any> = {};

      if (target === "gemini") {
        payload.geminiApiKey = geminiApiKey;
        payload.geminiModel = geminiModel;
      } else if (target === "sarvam") {
        payload.sarvamApiKey = sarvamApiKey;
      } else if (target === "twilio") {
        payload.twilioAccountSid = twilioAccountSid;
        payload.twilioAuthToken = twilioAuthToken;
        payload.twilioPhoneNumber = twilioPhoneNumber;
      } else if (target === "plivo") {
        payload.plivoAuthId = plivoAuthId;
        payload.plivoAuthToken = plivoAuthToken;
        payload.plivoPhoneNumber = plivoPhoneNumber;
      }

      const res = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, keys: payload }),
      });

      const data = await res.json();
      setTestStatuses((prev) => ({
        ...prev,
        [target]: { success: data.success, message: data.message || "Failed connection test." },
      }));
    } catch (error: any) {
      setTestStatuses((prev) => ({
        ...prev,
        [target]: { success: false, message: `Test execution crashed: ${error.message}` },
      }));
    } finally {
      setTestingTarget(null);
    }
  }

  // Save settings
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setSaveSuccess(false);

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sarvamApiKey,
          geminiApiKey,
          openaiApiKey,
          twilioAccountSid,
          twilioAuthToken,
          twilioPhoneNumber,
          publicWebhookUrl,
          plivoAuthId,
          plivoAuthToken,
          plivoPhoneNumber,
          geminiModel,
          defaultVoiceId,
          defaultLanguage,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("Failed to update system settings.");
      }
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
    }
  }

  const voicePresets = [
    { id: "suvarna", name: "Suvarna (Marathi - Female)", lang: "mr-IN" },
    { id: "meera", name: "Meera (Hindi - Female)", lang: "hi-IN" },
    { id: "arvind", name: "Arvind (Hindi/English - Male)", lang: "hi-IN" },
    { id: "gitika", name: "Gitika (Bengali - Female)", lang: "bn-IN" },
  ];

  const languages = [
    { code: "mr-IN", name: "Marathi (मराठी)" },
    { code: "hi-IN", name: "Hindi (हिंदी)" },
    { code: "en-IN", name: "Indian English" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <SettingsIcon className="text-indigo-400" size={22} />
          System Settings & API Keys
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-semibold">
          Configure API credentials, choose models, and run live connection checks for Nashik Telecalling.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Card 1: AI API Keys */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="font-semibold text-sm text-slate-300 flex items-center gap-2">
                <Key size={16} className="text-indigo-400" />
                Gemini & Sarvam Credentials
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={testingTarget !== null}
                  onClick={() => testConnection("gemini")}
                  className="px-2.5 py-1 text-[10px] bg-slate-850 border border-slate-800 rounded-lg text-slate-300 hover:text-indigo-400 flex items-center gap-1.5"
                >
                  {testingTarget === "gemini" && <RefreshCw size={10} className="animate-spin" />}
                  Test Gemini
                </button>
                <button
                  type="button"
                  disabled={testingTarget !== null}
                  onClick={() => testConnection("sarvam")}
                  className="px-2.5 py-1 text-[10px] bg-slate-850 border border-slate-800 rounded-lg text-slate-300 hover:text-indigo-400 flex items-center gap-1.5"
                >
                  {testingTarget === "sarvam" && <RefreshCw size={10} className="animate-spin" />}
                  Test Sarvam
                </button>
              </div>
            </div>

            {/* Test Status Indicator */}
            {testStatuses.gemini && (
              <div className={`p-2.5 rounded-lg text-[10px] flex items-start gap-1.5 font-medium ${testStatuses.gemini.success ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/20" : "bg-rose-950/20 text-rose-400 border border-rose-900/20"}`}>
                {testStatuses.gemini.success ? <Check size={12} className="mt-0.5" /> : <XCircle size={12} className="mt-0.5" />}
                <span>Gemini Diagnosis: {testStatuses.gemini.message}</span>
              </div>
            )}
            {testStatuses.sarvam && (
              <div className={`p-2.5 rounded-lg text-[10px] flex items-start gap-1.5 font-medium ${testStatuses.sarvam.success ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/20" : "bg-rose-950/20 text-rose-400 border border-rose-900/20"}`}>
                {testStatuses.sarvam.success ? <Check size={12} className="mt-0.5" /> : <XCircle size={12} className="mt-0.5" />}
                <span>Sarvam Diagnosis: {testStatuses.sarvam.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gemini Key */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showGemini ? "text" : "password"}
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Enter Google Gemini API Key"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGemini(!showGemini)}
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showGemini ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Gemini Model */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Active Gemini Model</label>
                <input
                  type="text"
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  placeholder="e.g. gemini-3.1-flash-lite"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                />
              </div>
            </div>

            {/* Sarvam Key */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Sarvam AI API Key</label>
              <div className="relative">
                <input
                  type={showSarvam ? "text" : "password"}
                  value={sarvamApiKey}
                  onChange={(e) => setSarvamApiKey(e.target.value)}
                  placeholder="Enter Sarvam Subscription API Key"
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSarvam(!showSarvam)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showSarvam ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Twilio Configuration */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="font-semibold text-sm text-slate-300 flex items-center gap-2">
                <Smartphone size={16} className="text-indigo-400" />
                Twilio Provider Settings
              </h3>
              <button
                type="button"
                disabled={testingTarget !== null}
                onClick={() => testConnection("twilio")}
                className="px-2.5 py-1 text-[10px] bg-slate-850 border border-slate-800 rounded-lg text-slate-300 hover:text-indigo-400 flex items-center gap-1.5"
              >
                {testingTarget === "twilio" && <RefreshCw size={10} className="animate-spin" />}
                Test Twilio
              </button>
            </div>

            {testStatuses.twilio && (
              <div className={`p-2.5 rounded-lg text-[10px] flex items-start gap-1.5 font-medium ${testStatuses.twilio.success ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/20" : "bg-rose-950/20 text-rose-400 border border-rose-900/20"}`}>
                {testStatuses.twilio.success ? <Check size={12} className="mt-0.5" /> : <XCircle size={12} className="mt-0.5" />}
                <span>Twilio Diagnosis: {testStatuses.twilio.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Twilio Account SID</label>
                <div className="relative">
                  <input
                    type={showTwilioSid ? "text" : "password"}
                    value={twilioAccountSid}
                    onChange={(e) => setTwilioAccountSid(e.target.value)}
                    placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTwilioSid(!showTwilioSid)}
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showTwilioSid ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Twilio Auth Token</label>
                <div className="relative">
                  <input
                    type={showTwilioToken ? "text" : "password"}
                    value={twilioAuthToken}
                    onChange={(e) => setTwilioAuthToken(e.target.value)}
                    placeholder="Twilio Auth Token"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTwilioToken(!showTwilioToken)}
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showTwilioToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Twilio Phone Number</label>
                <input
                  type="text"
                  value={twilioPhoneNumber}
                  onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                  placeholder="e.g. +15005550006"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Public Webhook URL (ngrok)</label>
                <input
                  type="text"
                  value={publicWebhookUrl}
                  onChange={(e) => setPublicWebhookUrl(e.target.value)}
                  placeholder="e.g. https://xxxx-xxxx.ngrok-free.app"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Plivo Configuration */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="font-semibold text-sm text-slate-300 flex items-center gap-2">
                <Smartphone size={16} className="text-indigo-400" />
                Plivo Provider Settings (Nashik MVP)
              </h3>
              <button
                type="button"
                disabled={testingTarget !== null}
                onClick={() => testConnection("plivo")}
                className="px-2.5 py-1 text-[10px] bg-slate-850 border border-slate-800 rounded-lg text-slate-300 hover:text-indigo-400 flex items-center gap-1.5"
              >
                {testingTarget === "plivo" && <RefreshCw size={10} className="animate-spin" />}
                Test Plivo
              </button>
            </div>

            {testStatuses.plivo && (
              <div className={`p-2.5 rounded-lg text-[10px] flex items-start gap-1.5 font-medium ${testStatuses.plivo.success ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/20" : "bg-rose-950/20 text-rose-400 border border-rose-900/20"}`}>
                {testStatuses.plivo.success ? <Check size={12} className="mt-0.5" /> : <XCircle size={12} className="mt-0.5" />}
                <span>Plivo Diagnosis: {testStatuses.plivo.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Plivo Auth ID</label>
                <div className="relative">
                  <input
                    type={showPlivoId ? "text" : "password"}
                    value={plivoAuthId}
                    onChange={(e) => setPlivoAuthId(e.target.value)}
                    placeholder="Enter Plivo Auth ID"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPlivoId(!showPlivoId)}
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPlivoId ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Plivo Auth Token</label>
                <div className="relative">
                  <input
                    type={showPlivoToken ? "text" : "password"}
                    value={plivoAuthToken}
                    onChange={(e) => setPlivoAuthToken(e.target.value)}
                    placeholder="Enter Plivo Auth Token"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPlivoToken(!showPlivoToken)}
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPlivoToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Plivo Phone Number</label>
              <input
                type="text"
                value={plivoPhoneNumber}
                onChange={(e) => setPlivoPhoneNumber(e.target.value)}
                placeholder="e.g. +91XXXXXXXXXX"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-mono"
              />
            </div>
          </div>

          {/* Card 4: Default config */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
            <h3 className="font-semibold text-sm text-slate-300 flex items-center gap-2 border-b border-slate-850 pb-3">
              <Volume2 size={16} className="text-indigo-400" />
              Campaign Default Specifications
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Language</label>
                <select
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Voice Preset</label>
                <select
                  value={defaultVoiceId}
                  onChange={(e) => setDefaultVoiceId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
                >
                  {voicePresets.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between">
            {saveSuccess ? (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 animate-bounce">
                <CheckCircle size={16} />
                System settings updated successfully!
              </span>
            ) : (
              <span></span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg disabled:opacity-50 transition-all cursor-pointer"
            >
              <Save size={16} />
              {saving ? "Saving Configurations..." : "Save Configurations"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
