"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  History,
  Search,
  Volume2,
  Calendar,
  Clock,
  Heart,
  FileText,
  User,
  ChevronRight,
  Filter,
  Play,
  Pause,
  Info
} from "lucide-react";
import { formatKolkataTime } from "@/lib/date";

interface CallLog {
  id: string;
  duration: number;
  transcriptJSON: string;
  summary: string | null;
  leadStatus: string;
  sentimentScore: number;
  recordingUrl: string | null;
  createdAt: string;
  telephonyProvider: string | null;
  customer: {
    name: string;
    phone: string;
    email: string | null;
    company: string | null;
    city: string | null;
    product: string | null;
    notes: string | null;
  };
  campaign: {
    name: string;
  };
}

export default function CallLogs() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Simulated Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [playSpeed, setPlaySpeed] = useState(1);
  const playerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load call logs
  async function loadLogs() {
    try {
      const res = await fetch("/api/calls");
      if (res.ok) {
        const data = await res.json();
        // Defensive client-side deduplication filter
        const uniqueLogs = data.filter((item: CallLog, index: number, self: CallLog[]) =>
          self.findIndex((t) => t.id === item.id) === index
        );
        setLogs(uniqueLogs);
      }
    } catch (err) {
      console.error("Error loading call logs:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  // Handle Play/Pause in simulated audio player
  const handlePlayToggle = () => {
    if (isPlaying) {
      if (playerIntervalRef.current) {
        clearInterval(playerIntervalRef.current);
        playerIntervalRef.current = null;
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playerIntervalRef.current = setInterval(() => {
        setPlayProgress((prev) => {
          if (prev >= 100) {
            clearInterval(playerIntervalRef.current!);
            playerIntervalRef.current = null;
            setIsPlaying(false);
            return 0;
          }
          return prev + 2 * playSpeed;
        });
      }, 100);
    }
  };

  useEffect(() => {
    return () => {
      if (playerIntervalRef.current) clearInterval(playerIntervalRef.current);
    };
  }, []);

  const openLogDetails = (log: CallLog) => {
    setSelectedLog(log);
    setIsPlaying(false);
    setPlayProgress(0);
    if (playerIntervalRef.current) {
      clearInterval(playerIntervalRef.current);
      playerIntervalRef.current = null;
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.customer.phone.includes(searchQuery) ||
      log.campaign.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter ? log.leadStatus === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  const parsedTranscript = (jsonStr: string): { role: string; text: string; timestamp?: string }[] => {
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      return [];
    }
  };

  const leadStatuses = [
    { code: "APPOINTMENT_BOOKED", name: "Appointment Booked" },
    { code: "VERY_INTERESTED", name: "Very Interested" },
    { code: "INTERESTED", name: "Interested" },
    { code: "CALLBACK_REQUESTED", name: "Callback Requested" },
    { code: "NOT_INTERESTED", name: "Not Interested" },
    { code: "BUSY", name: "Busy" },
    { code: "NO_ANSWER", name: "No Answer" },
    { code: "WRONG_NUMBER", name: "Wrong Number" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <History className="text-indigo-400" size={22} />
          Call Logs & Recordings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review conversation histories, listen to simulated audio playbacks, and monitor qualifications.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search logs by customer name, phone, campaign..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
          />
          <Search className="absolute left-3.5 top-3.5 text-slate-600" size={13} />
        </div>

        <div className="flex items-center gap-3">
          <Filter size={15} className="text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs sm:w-48"
          >
            <option value="">All Lead Statuses</option>
            {leadStatuses.map((st) => (
              <option key={st.code} value={st.code}>{st.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Call Logs Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 text-xs">
          No matching call records found.
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-950/20">
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Provider</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Duration</th>
                  <th className="py-3.5 px-6">Sentiment</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => openLogDetails(log)}
                    className="hover:bg-slate-950/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                        {log.customer.name}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{log.customer.phone} • {log.campaign.name}</p>
                    </td>
                    <td className="py-4 px-6 text-slate-400 text-xs font-mono capitalize">
                      {log.telephonyProvider || "twilio"}
                    </td>
                    <td className="py-4 px-6 text-slate-400 font-medium">
                      {formatKolkataTime(log.createdAt)}
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-400">
                      {Math.floor(log.duration / 60)}m {log.duration % 60}s
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            log.sentimentScore >= 75
                              ? "text-emerald-400"
                              : log.sentimentScore >= 45
                              ? "text-indigo-400"
                              : "text-rose-400"
                          }`}
                        >
                          {log.sentimentScore}%
                        </span>
                        <div className="w-16 bg-slate-950 border border-slate-850 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              log.sentimentScore >= 75
                                ? "bg-emerald-500"
                                : log.sentimentScore >= 45
                                ? "bg-indigo-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${log.sentimentScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide inline-block ${
                          log.leadStatus === "APPOINTMENT_BOOKED"
                            ? "bg-fuchsia-950/40 border border-fuchsia-900 text-fuchsia-400"
                            : log.leadStatus.includes("INTERESTED")
                            ? "bg-emerald-950/40 border border-emerald-900 text-emerald-400"
                            : log.leadStatus === "CALLBACK_REQUESTED"
                            ? "bg-amber-950/40 border border-amber-900 text-amber-400"
                            : "bg-slate-800 border border-slate-700 text-slate-400"
                        }`}
                      >
                        {log.leadStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <ChevronRight className="text-slate-650 group-hover:text-slate-300 transition-colors" size={15} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transcript Detail Drawer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          {/* Backdrop */}
          <div onClick={() => setSelectedLog(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>

          {/* Drawer Container */}
          <div className="relative w-full max-w-2xl h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between animate-slide-left z-10">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-100 flex items-center gap-2">
                  <User size={16} className="text-indigo-400" />
                  {selectedLog.customer.name}
                </h2>
                <p className="text-[10px] text-slate-550 uppercase font-semibold mt-0.5">
                  Call Record: {formatKolkataTime(selectedLog.createdAt)}
                </p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Stats Summary cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl text-center">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Duration</span>
                  <p className="text-sm font-mono font-bold text-slate-200 mt-1">
                    {Math.floor(selectedLog.duration / 60)}m {selectedLog.duration % 60}s
                  </p>
                </div>
                <div className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl text-center">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Sentiment</span>
                  <p className="text-sm font-bold text-indigo-400 mt-1">{selectedLog.sentimentScore}%</p>
                </div>
                <div className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl text-center">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Lead Status</span>
                  <p className="text-[10px] font-bold text-slate-200 mt-1 truncate">
                    {selectedLog.leadStatus.replace("_", " ")}
                  </p>
                </div>
              </div>

              {/* Call Summary */}
              {selectedLog.summary && (
                <div className="space-y-2">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <FileText size={12} className="text-indigo-400" />
                    AI Executive Summary
                  </span>
                  <p className="text-xs text-slate-350 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-850">
                    {selectedLog.summary}
                  </p>
                </div>
              )}

              {/* Simulated Recording Audio Player */}
              <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 size={16} className="text-indigo-400" />
                    <span className="text-xs font-bold text-slate-200">Call Recording Playback</span>
                  </div>
                  {/* Speed toggle */}
                  <button
                    onClick={() => setPlaySpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))}
                    className="text-[10px] font-bold bg-slate-900 border border-slate-800 text-indigo-400 px-2 py-0.5 rounded"
                  >
                    {playSpeed}x Speed
                  </button>
                </div>

                {/* Progress bar and controls */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={handlePlayToggle}
                    className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all"
                  >
                    {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                  </button>

                  <div className="flex-1 bg-slate-900 border border-slate-850 h-2.5 rounded-full overflow-hidden relative cursor-pointer">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-100"
                      style={{ width: `${playProgress}%` }}
                    ></div>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono font-semibold">
                    {Math.floor(((selectedLog.duration * playProgress) / 100) / 60)}:
                    {String(Math.floor(((selectedLog.duration * playProgress) / 100) % 60)).padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Chat Bubble Transcript Feed */}
              <div className="space-y-4">
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Full Conversation Transcript
                </span>

                <div className="space-y-3.5 bg-slate-950 p-5 rounded-2xl border border-slate-850 max-h-[300px] overflow-y-auto">
                  {parsedTranscript(selectedLog.transcriptJSON).length === 0 ? (
                    <p className="text-center text-slate-650 text-xs italic">No transcript recorded for this call.</p>
                  ) : (
                    parsedTranscript(selectedLog.transcriptJSON).map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${
                          m.role === "ai" ? "items-start" : "items-end"
                        }`}
                      >
                        <span className="text-[9px] text-slate-500 mb-1 font-semibold uppercase">
                          {m.role === "ai" ? "AI ASSISTANT (Vani)" : "CUSTOMER"}
                        </span>
                        <div
                          className={`max-w-[85%] px-4 py-2 rounded-xl text-xs leading-relaxed ${
                            m.role === "ai"
                              ? "bg-slate-900 text-slate-300 rounded-tl-none border border-slate-800"
                              : "bg-indigo-900/40 text-slate-200 rounded-tr-none border border-indigo-950"
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
