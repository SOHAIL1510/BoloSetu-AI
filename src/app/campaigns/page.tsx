"use client";

import React, { useState, useEffect } from "react";
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Trash2,
  Calendar,
  Layers,
  CheckCircle,
  HelpCircle,
  FileText,
  Volume2
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  voiceId: string;
  language: string;
  status: "DRAFT" | "SCHEDULED" | "RUNNING" | "PAUSED" | "COMPLETED";
  retryAttempts: number;
  callTiming: string;
  createdAt: string;
  stats: {
    totalCustomers: number;
    callsCompleted: number;
    callsPending: number;
    callsFailed: number;
    interestedLeads: number;
  };
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(
    `You are an AI sales assistant calling on behalf of ABC Institute.\nIntroduce yourself as an AI assistant.\nAddress the customer by name: {{customer_name}}.\nExplain our course: {{product}}.\nAnswer questions professionally.\nIf interested, schedule a demo session.\nNever pressure customers.\nKeep conversations natural and concise.`
  );
  const [voiceId, setVoiceId] = useState("meera");
  const [language, setLanguage] = useState("hi-IN");
  const [callTiming, setCallTiming] = useState("9:00 AM - 6:00 PM");
  const [retryAttempts, setRetryAttempts] = useState(3);
  const [saving, setSaving] = useState(false);

  // Fetch campaigns
  async function loadCampaigns() {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error("Error loading campaigns:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  // Update campaign status (Start, Pause, Resume, Stop)
  async function updateStatus(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadCampaigns();
      }
    } catch (err) {
      console.error("Error updating campaign status:", err);
    }
  }

  // Delete campaign
  async function deleteCampaign(id: string) {
    if (!confirm("Are you sure you want to delete this campaign? This will delete all linked customers and call logs.")) return;
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadCampaigns();
      }
    } catch (err) {
      console.error("Error deleting campaign:", err);
    }
  }

  // Submit form
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !systemPrompt) return;

    try {
      setSaving(true);
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          systemPrompt,
          voiceId,
          language,
          callTiming,
          retryAttempts,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        // Reset form
        setName("");
        setDescription("");
        setVoiceId("meera");
        setLanguage("hi-IN");
        loadCampaigns();
      }
    } catch (err) {
      console.error("Error creating campaign:", err);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Megaphone className="text-indigo-400" size={22} />
            Campaign Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">Configure calling guidelines, prompts, retry counts, and target voice styles.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg transition-all"
        >
          <Plus size={16} />
          Create Campaign
        </button>
      </div>

      {/* Campaigns Listing */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500">
          No campaigns found. Click "Create Campaign" to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all duration-300 relative group"
            >
              {/* Campaign Header Details */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                      camp.status === "RUNNING"
                        ? "bg-emerald-950/40 border border-emerald-800 text-emerald-400"
                        : camp.status === "PAUSED"
                        ? "bg-amber-950/40 border border-amber-800 text-amber-400"
                        : camp.status === "COMPLETED"
                        ? "bg-indigo-950/40 border border-indigo-800 text-indigo-400"
                        : "bg-slate-800 border border-slate-700 text-slate-400"
                    }`}
                  >
                    {camp.status}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deleteCampaign(camp.id)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-rose-400 transition-colors"
                      title="Delete Campaign"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{camp.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[32px]">{camp.description || "No description provided."}</p>

                {/* Grid info */}
                <div className="grid grid-cols-2 gap-4 my-5 p-3.5 bg-slate-950/50 rounded-xl border border-slate-850/60">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Language</span>
                    <span className="text-xs font-semibold text-slate-350 mt-0.5">
                      {languages.find((l) => l.code === camp.language)?.name || camp.language}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Voice Preset</span>
                    <span className="text-xs font-semibold text-slate-350 mt-0.5 flex items-center gap-1">
                      <Volume2 size={12} className="text-indigo-400" />
                      {voicePresets.find((v) => v.id === camp.voiceId)?.name.split(" (")[0] || camp.voiceId}
                    </span>
                  </div>
                </div>

                {/* Campaign Progress Aggregations */}
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-450">Calling Ingestion Queue</span>
                    <span className="text-slate-300">
                      {camp.stats.callsCompleted}/{camp.stats.totalCustomers} Connected
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          camp.stats.totalCustomers > 0
                            ? (camp.stats.callsCompleted / camp.stats.totalCustomers) * 100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>

                  {/* Micro Grid stats */}
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase pt-2">
                    <span>Pending: {camp.stats.callsPending}</span>
                    <span className="text-rose-450">Failed: {camp.stats.callsFailed}</span>
                    <span className="text-violet-400">Leads: {camp.stats.interestedLeads}</span>
                  </div>
                </div>
              </div>

              {/* Status Controls */}
              <div className="border-t border-slate-850 mt-6 pt-4 flex gap-2">
                {camp.status !== "RUNNING" && camp.status !== "COMPLETED" && (
                  <button
                    onClick={() => updateStatus(camp.id, "RUNNING")}
                    className="flex-1 py-2 text-xs font-bold rounded-xl bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600 text-indigo-400 hover:text-white flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Play size={12} />
                    Start Campaign
                  </button>
                )}
                {camp.status === "RUNNING" && (
                  <button
                    onClick={() => updateStatus(camp.id, "PAUSED")}
                    className="flex-1 py-2 text-xs font-bold rounded-xl bg-amber-600/10 border border-amber-500/20 hover:bg-amber-600 text-amber-400 hover:text-white flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Pause size={12} />
                    Pause Campaign
                  </button>
                )}
                {camp.status === "PAUSED" && (
                  <button
                    onClick={() => updateStatus(camp.id, "RUNNING")}
                    className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600 text-emerald-400 hover:text-white flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Play size={12} />
                    Resume Campaign
                  </button>
                )}
                {camp.status !== "COMPLETED" && (
                  <button
                    onClick={() => updateStatus(camp.id, "COMPLETED")}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-indigo-400 transition-all"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal Wizard */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>

          {/* Modal Container */}
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
              <h2 className="font-bold text-slate-100 flex items-center gap-2">
                <Layers size={18} className="text-indigo-400" />
                Configure New Campaign
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Campaign Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Summer Batch Inbound Followups"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief objective details"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Language</label>
                  <select
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      // Auto switch matching voice
                      const matchVoice = voicePresets.find((v) => v.lang === e.target.value);
                      if (matchVoice) setVoiceId(matchVoice.id);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    {languages.map((l) => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sarvam Voice Preset</label>
                  <select
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    {voicePresets.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>AI Agent System Prompt *</span>
                  <span className="text-[10px] font-medium text-slate-500 normal-case">
                    Inject fields using <code>{"{{customer_name}}"}</code>, <code>{"{{product}}"}</code>, <code>{"{{city}}"}</code>
                  </span>
                </label>
                <textarea
                  required
                  rows={6}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-sm font-mono leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Calling Hours</label>
                  <input
                    type="text"
                    value={callTiming}
                    onChange={(e) => setCallTiming(e.target.value)}
                    placeholder="e.g. 9:00 AM - 6:00 PM"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Max Retry Attempts</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={retryAttempts}
                    onChange={(e) => setRetryAttempts(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-slate-850 pt-4 mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-850 border border-slate-800 text-slate-350 hover:bg-slate-800 hover:text-slate-100 text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-purple-500 shadow-lg disabled:opacity-50 transition-all"
                >
                  {saving ? "Creating..." : "Save Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
