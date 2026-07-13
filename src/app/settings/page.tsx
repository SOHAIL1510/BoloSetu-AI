"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Save,
  Key,
  Volume2,
  Globe,
  CheckCircle,
  HelpCircle,
  Eye,
  EyeOff,
  Smartphone
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

  // Default campaign parameters
  const [defaultVoiceId, setDefaultVoiceId] = useState("meera");
  const [defaultLanguage, setDefaultLanguage] = useState("en-IN");
  
  // Visual masking eye toggles
  const [showSarvam, setShowSarvam] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showTwilioSid, setShowTwilioSid] = useState(false);
  const [showTwilioToken, setShowTwilioToken] = useState(false);

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
    { id: "meera", name: "Meera (Hindi - Female)", lang: "hi-IN" },
    { id: "arvind", name: "Arvind (Hindi/English - Male)", lang: "hi-IN" },
    { id: "pavithra", name: "Pavithra (Tamil - Female)", lang: "ta-IN" },
    { id: "lalitha", name: "Lalitha (Telugu - Female)", lang: "te-IN" },
    { id: "gitika", name: "Gitika (Bengali - Female)", lang: "bn-IN" },
    { id: "suvarna", name: "Suvarna (Marathi - Female)", lang: "mr-IN" },
    { id: "kavya", name: "Kavya (Kannada - Female)", lang: "kn-IN" },
    { id: "prathibha", name: "Prathibha (Malayalam - Female)", lang: "ml-IN" },
  ];

  const languages = [
    { code: "hi-IN", name: "Hindi (हिंदी)" },
    { code: "en-IN", name: "Indian English" },
    { code: "ta-IN", name: "Tamil (தமிழ்)" },
    { code: "te-IN", name: "Telugu (తెలుగు)" },
    { code: "bn-IN", name: "Bengali (বাংলা)" },
    { code: "mr-IN", name: "Marathi (मराठी)" },
    { code: "kn-IN", name: "Kannada (ಕನ್ನಡ)" },
    { code: "ml-IN", name: "Malayalam (മലയാളം)" },
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
          Configure API connection parameters for Sarvam AI Voice, Gemini, and Twilio outbound calling.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Card 1: AI API Keys */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="font-semibold text-sm text-slate-350 flex items-center gap-2 border-b border-slate-850 pb-3">
              <Key size={16} className="text-indigo-400" />
              AI Credentials Setup
            </h3>

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
              <p className="text-[10px] text-slate-550 pt-0.5">Required for high-quality Indic Speech-to-Text and Text-to-Speech voices.</p>
            </div>

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
              <p className="text-[10px] text-slate-550 pt-0.5">Required for conversational intelligence (summaries, classifications, RAG responses).</p>
            </div>

            {/* OpenAI Key */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">OpenAI API Key (Optional)</label>
              <div className="relative">
                <input
                  type={showOpenai ? "text" : "password"}
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder="Enter OpenAI API Key"
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenai(!showOpenai)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showOpenai ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-slate-550 pt-0.5">Alternative LLM key used for conversation grounding.</p>
            </div>
          </div>

          {/* Card 2: Twilio Settings (NEW DETAILS) */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="font-semibold text-sm text-slate-350 flex items-center gap-2 border-b border-slate-850 pb-3">
              <Smartphone size={16} className="text-indigo-400" />
              Twilio Outbound Calling Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Twilio SID */}
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

              {/* Twilio Token */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Twilio Auth Token</label>
                <div className="relative">
                  <input
                    type={showTwilioToken ? "text" : "password"}
                    value={twilioAuthToken}
                    onChange={(e) => setTwilioAuthToken(e.target.value)}
                    placeholder="Enter Twilio Auth Token"
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
              {/* Twilio Phone Number */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Twilio Phone Number</label>
                <input
                  type="text"
                  value={twilioPhoneNumber}
                  onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                  placeholder="e.g. +15005550006"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                />
                <p className="text-[9px] text-slate-550">Must include country code (e.g. +1 or +91).</p>
              </div>

              {/* Public Webhook URL */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Public Webhook URL (ngrok)</label>
                <input
                  type="text"
                  value={publicWebhookUrl}
                  onChange={(e) => setPublicWebhookUrl(e.target.value)}
                  placeholder="e.g. https://1234-abcd.ngrok-free.app"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                />
                <p className="text-[9px] text-slate-550">Your public ngrok tunnel URL where Twilio webhook calls are forwarded.</p>
              </div>
            </div>
          </div>

          {/* Card 3: Default config */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="font-semibold text-sm text-slate-350 flex items-center gap-2 border-b border-slate-850 pb-3">
              <Volume2 size={16} className="text-indigo-400" />
              Default Calling Config
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Default Language</label>
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
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Default Voice Preset</label>
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
