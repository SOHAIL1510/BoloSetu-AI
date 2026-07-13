"use client";

import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Calendar,
  Smile,
  AlertCircle,
  Play,
  Users,
  Award,
  Send,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Smartphone,
  Info,
  XCircle
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  language: string;
  voiceId: string;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  city: string | null;
  product: string | null;
  status: string;
}

interface Message {
  role: "ai" | "customer";
  text: string;
  timestamp: string;
}

export default function CallSimulator() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [pendingCustomers, setPendingCustomers] = useState<Customer[]>([]);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  // Twilio Mode vs Browser Simulator Mode
  const [useTwilioCall, setUseTwilioCall] = useState(false);
  const [activeCallLogId, setActiveCallLogId] = useState<string | null>(null);
  const [activeCallSid, setActiveCallSid] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Custom UI Warning Modal State
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);

  // Calling States
  const [callState, setCallState] = useState<"idle" | "ringing" | "connected" | "hanging_up" | "auditing">("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [duration, setDuration] = useState(0);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio & Speech States (Browser Mode)
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [textInput, setTextInput] = useState("");
  const recognitionRef = useRef<any>(null);

  // AI response player refs (Browser Mode)
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // Post-Call Audit Details
  const [auditDetails, setAuditDetails] = useState<{
    summary: string;
    leadStatus: string;
    sentimentScore: number;
    appointmentBooked: boolean;
    appointmentDateTime: string | null;
  } | null>(null);

  const [isGeminiKeyMissing, setIsGeminiKeyMissing] = useState(false);
  const [isSarvamKeyMissing, setIsSarvamKeyMissing] = useState(false);

  // Load Campaigns & check credentials configuration status
  async function loadCampaigns() {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
        if (data.length > 0) setSelectedCampaignId(data[0].id);
      }

      const settingsRes = await fetch("/api/settings");
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setIsGeminiKeyMissing(!settings.geminiApiKey);
        setIsSarvamKeyMissing(!settings.sarvamApiKey);
      }
    } catch (err) {
      console.error("Error loading campaigns and settings:", err);
    }
  }

  // Load pending customers for selected campaign
  async function loadPendingCustomers(campId: string) {
    if (!campId) return;
    try {
      const res = await fetch(`/api/customers?campaignId=${campId}`);
      if (res.ok) {
        const data = await res.json();
        setPendingCustomers(data.filter((c: Customer) => c.status === "PENDING"));
      }
    } catch (err) {
      console.error("Error loading customers:", err);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaignId) {
      loadPendingCustomers(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  // Setup Web Speech API for Browser-based Speech-to-Text
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        
        const currentCamp = campaigns.find((c) => c.id === selectedCampaignId);
        rec.lang = currentCamp?.language || "en-IN";

        rec.onstart = () => setIsListening(true);
        rec.onend = () => setIsListening(false);
        rec.onerror = (e: any) => {
          const errCode = e.error || "unknown";
          if (errCode === "no-speech") {
            console.warn("Speech recognition: Silence timeout (no speech detected).");
          } else {
            console.error("Speech recognition error:", errCode);
          }
          setIsListening(false);

          if (errCode === "not-allowed") {
            setErrorModal({
              title: "Microphone Access Blocked",
              message: "Please allow microphone access in your browser's address bar settings to speak directly with the AI agent."
            });
          } else if (errCode === "network") {
            setErrorModal({
              title: "Speech Service Offline",
              message: "Chrome's voice recognition service is temporarily unreachable or blocked by a firewall/VPN. You can continue your conversation by typing in the text input box at the bottom!"
            });
          }
        };
        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            handleSendCustomerMessage(transcript);
          }
        };

        recognitionRef.current = rec;
      }
    }
  }, [campaigns, selectedCampaignId]);

  // Handle Call Timer
  useEffect(() => {
    if (callState === "connected") {
      durationTimerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState]);

  // Play audio stream (base64 WAV)
  const playBase64Audio = async (base64String: string) => {
    try {
      setIsAiSpeaking(true);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const arrayBuffer = Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0)).buffer;
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setIsAiSpeaking(false);
        startVoiceListening();
      };
      source.start(0);
    } catch (err) {
      console.error("Error decoding base64 audio stream:", err);
      setIsAiSpeaking(false);
    }
  };

  // Speaks using Browser SpeechSynthesis (local fallback)
  const speakLocalFallback = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    setIsAiSpeaking(true);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const currentCamp = campaigns.find((c) => c.id === selectedCampaignId);
    utterance.lang = currentCamp?.language || "en-IN";
    
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) => v.lang.startsWith(utterance.lang.substring(0, 2)));
    if (matchingVoice) utterance.voice = matchingVoice;

    utterance.onend = () => {
      setIsAiSpeaking(false);
      startVoiceListening();
    };
    utterance.onerror = () => {
      setIsAiSpeaking(false);
    };
    window.speechSynthesis.speak(utterance);
  };

  // TTS Coordinator: Sarvam API -> Browser SpeechSynthesis Fallback
  const handleAITextToSpeech = async (text: string) => {
    const currentCamp = campaigns.find((c) => c.id === selectedCampaignId);
    if (!currentCamp) return;

    try {
      const res = await fetch("/api/sarvam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          languageCode: currentCamp.language,
          speaker: currentCamp.voiceId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audios && data.audios[0]) {
          await playBase64Audio(data.audios[0]);
          return;
        }
      }
      speakLocalFallback(text);
    } catch (err) {
      console.error("TTS failed, using local browser fallback:", err);
      speakLocalFallback(text);
    }
  };

  // Toggle Microphone Ingress
  const startVoiceListening = () => {
    if (recognitionRef.current && !isMuted && !isAiSpeaking && !useTwilioCall) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        // Recognition might already be running
      }
    }
  };

  const toggleMute = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsMuted(!isMuted);
  };

  // Start call session (Initiate browser call OR real Twilio call)
  const initiateCall = async (customer: Customer) => {
    if (!selectedCampaignId) {
      setErrorModal({
        title: "No Campaign Selected",
        message: "Please select a target campaign from the dropdown list before initiating dialing."
      });
      return;
    }

    setActiveCustomer(customer);
    setMessages([]);
    setDuration(0);
    setAuditDetails(null);

    if (useTwilioCall) {
      // TWILIO LIVE PHONE CALL MODE
      setCallState("ringing");
      try {
        const res = await fetch("/api/twilio/call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: customer.id,
            campaignId: selectedCampaignId,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          setErrorModal({
            title: "Telephony Connection Error",
            message: errData.message || "Failed to establish Twilio connection. Check logs and keys."
          });
          setCallState("idle");
          setActiveCustomer(null);
          return;
        }

        const callData = await res.json();
        setActiveCallLogId(callData.callLogId);
        setCallState("connected");
        startTwilioDatabasePolling(callData.callLogId);

      } catch (err: any) {
        setErrorModal({
          title: "Network Connection Failed",
          message: `Network error placing outbound call: ${err.message}`
        });
        setCallState("idle");
        setActiveCustomer(null);
      }
    } else {
      // CLIENT BROWSER SIMULATION MODE
      setCallState("ringing");
      const generatedSid = `sim-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      setActiveCallSid(generatedSid);
      setTimeout(async () => {
        setCallState("connected");
        try {
          const res = await fetch("/api/simulate-call", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId: customer.id,
              campaignId: selectedCampaignId,
              callLogId: generatedSid,
              messages: [],
              isFirstTurn: true,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const initialText = data.response;
            setMessages([{ role: "ai", text: initialText, timestamp: new Date().toISOString() }]);
            handleAITextToSpeech(initialText);
          }
        } catch (err) {
          console.error("Error starting conversation flow:", err);
        }
      }, 2500);
    }
  };

  // Polling database for Live Twilio call transcript updates
  const startTwilioDatabasePolling = (callLogId: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/calls?callLogId=${callLogId}`);
        if (res.ok) {
          const callLog = await res.json();
          
          if (callLog.transcriptJSON) {
            setMessages(JSON.parse(callLog.transcriptJSON));
          }

          if (callLog.leadStatus !== "PENDING") {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }

            setDuration(callLog.duration);
            setAuditDetails({
              summary: callLog.summary || "Call audited.",
              leadStatus: callLog.leadStatus,
              sentimentScore: callLog.sentimentScore,
              appointmentBooked: callLog.leadStatus === "APPOINTMENT_BOOKED",
              appointmentDateTime: null,
            });

            if (callLog.leadStatus === "APPOINTMENT_BOOKED") {
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
              });
            }

            loadPendingCustomers(selectedCampaignId);
            setCallState("auditing");
            setActiveCallLogId(null);
          }
        }
      } catch (err) {
        console.error("Error polling Twilio call session state:", err);
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  // Send customer dialogue to LLM (Browser Mode)
  const handleSendCustomerMessage = async (text: string) => {
    if (!text.trim() || !activeCustomer || useTwilioCall) return;

    const newMsg: Message = { role: "customer", text, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setTextInput("");

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    try {
      const res = await fetch("/api/simulate-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: activeCustomer.id,
          campaignId: selectedCampaignId,
          callLogId: activeCallSid,
          messages: updatedMessages,
          isFirstTurn: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiText = data.response;
        setMessages((prev) => [...prev, { role: "ai", text: aiText, timestamp: new Date().toISOString() }]);
        handleAITextToSpeech(aiText);
      }
    } catch (err) {
      console.error("Error in conversation dialog turn:", err);
    }
  };

  // Hangup call (Browser Mode)
  const hangUpCall = async () => {
    if (!activeCustomer || useTwilioCall || callState !== "connected") return;
    setCallState("hanging_up");

    if (recognitionRef.current) recognitionRef.current.stop();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    try {
      const auditRes = await fetch("/api/simulate-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: activeCustomer.id,
          campaignId: selectedCampaignId,
          callLogId: activeCallSid,
          messages: messages,
          isHangUp: true,
        }),
      });

      let audit = {
        summary: "Call terminated by user.",
        leadStatus: "NOT_INTERESTED",
        sentimentScore: 50.0,
        appointmentBooked: false,
        appointmentDateTime: null,
      };

      if (auditRes.ok) {
        audit = await auditRes.json();
      }

      setAuditDetails(audit);

      const logRes = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callSid: activeCallSid,
          customerId: activeCustomer.id,
          campaignId: selectedCampaignId,
          duration: duration,
          transcriptJSON: messages,
          summary: audit.summary,
          leadStatus: audit.leadStatus,
          sentimentScore: audit.sentimentScore,
          recordingUrl: `simulated_call_${Date.now()}.wav`,
        }),
      });

      if (audit.appointmentBooked && audit.appointmentDateTime) {
        let loggedCallLogId = null;
        if (logRes.ok) {
          const logData = await logRes.json();
          loggedCallLogId = logData.id;
        }

        await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: activeCustomer.id,
            callLogId: loggedCallLogId,
            dateTime: audit.appointmentDateTime,
          }),
        });

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      loadPendingCustomers(selectedCampaignId);
      setCallState("auditing");
    } catch (err) {
      console.error("Error finalizing call log:", err);
      setCallState("idle");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendCustomerMessage(textInput);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <PhoneCall className="text-indigo-400" size={22} />
          AI Outbound Telecalling Panel
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure calling modes (Browser Sandbox or Live Telephony Dialing) and trigger outreach to customers.
        </p>
      </div>

      {isGeminiKeyMissing && (
        <div className="p-4 bg-amber-950/20 border border-amber-900/60 rounded-2xl flex items-start gap-3 animate-pulse">
          <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-400">Offline Fallback Mode Active (Gemini API Key Missing)</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Your organization's **Google Gemini API Key** is not configured. The call simulator is running in fallback mode using pre-programmed answers. Save your Gemini API Key in the <a href="/settings" className="text-indigo-400 hover:underline font-semibold">Settings page</a> to enable live conversational AI.
            </p>
          </div>
        </div>
      )}

      {isSarvamKeyMissing && (
        <div className="p-4 bg-amber-950/20 border border-amber-900/60 rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-400">Local Browser Voice Fallback Active (Sarvam API Key Missing)</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Your organization's **Sarvam AI API Key** is not configured. Voice outputs will fall back to your browser's default system voice (which may switch between male/female depending on your OS settings). Configure your Sarvam Key in the <a href="/settings" className="text-indigo-400 hover:underline font-semibold">Settings page</a> to enable high-quality Indic voice presets.
            </p>
          </div>
        </div>
      )}

      {callState === "idle" || callState === "auditing" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Target Campaign Select and Customer Queue */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-sm text-slate-350 flex items-center gap-2">
                  <Users size={16} className="text-indigo-400" />
                  Select Campaign Outbound Queue
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Pending leads list</p>
              </div>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-805 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs sm:w-64"
              >
                {campaigns.length === 0 ? (
                  <option value="">No campaigns available</option>
                ) : (
                  campaigns.map((camp) => (
                    <option key={camp.id} value={camp.id}>{camp.name}</option>
                  ))
                )}
              </select>
            </div>

            {/* TWILIO DIALING TOGGLE CONTROL */}
            <div className="flex items-center gap-3 p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
              <Smartphone size={20} className="text-indigo-400" />
              <div className="flex-1 text-left">
                <span className="text-xs font-bold text-slate-200 block">Dial Live Customer Phone (via Twilio)</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Outbound call dials the actual customer phone number and streams Indic voice.
                </span>
              </div>
              <input
                type="checkbox"
                checked={useTwilioCall}
                onChange={(e) => setUseTwilioCall(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-slate-800 rounded bg-slate-950 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
              />
            </div>

            {/* Leads Queue list */}
            {pendingCustomers.length === 0 ? (
              <div className="p-12 text-center text-slate-500 border border-slate-850 bg-slate-950/20 rounded-xl text-xs">
                No pending customer leads in this campaign queue. Go to "Customer Import" to upload leads!
              </div>
            ) : (
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {pendingCustomers.map((cust) => (
                  <div
                    key={cust.id}
                    className="p-4 bg-slate-950/50 hover:bg-slate-950 border border-slate-850/60 rounded-xl flex items-center justify-between gap-4 group transition-all"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-200 group-hover:text-indigo-400 transition-colors">{cust.name}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                        <span>Phone: {cust.phone}</span>
                        {cust.city && <span>City: {cust.city}</span>}
                        {cust.product && <span className="text-indigo-300 font-medium">{cust.product}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => initiateCall(cust)}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/20 flex items-center gap-1.5 transition-all"
                    >
                      <PhoneCall size={12} />
                      {useTwilioCall ? "Place Call" : "Call Lead"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Result Panel */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            {callState === "auditing" && auditDetails ? (
              <div className="space-y-5 animate-fade-in">
                <h3 className="font-semibold text-sm text-slate-350 flex items-center gap-2 border-b border-slate-850 pb-3">
                  <Award className="text-amber-400" size={16} />
                  Post-Call Audit Report
                </h3>

                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Qualifying Lead Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase inline-block ${
                      auditDetails.leadStatus === "APPOINTMENT_BOOKED"
                        ? "bg-fuchsia-950/50 border border-fuchsia-800 text-fuchsia-400"
                        : auditDetails.leadStatus.includes("INTERESTED")
                        ? "bg-emerald-950/50 border border-emerald-800 text-emerald-400"
                        : auditDetails.leadStatus === "CALLBACK_REQUESTED"
                        ? "bg-amber-950/50 border border-amber-800 text-amber-400"
                        : "bg-slate-800 border border-slate-700 text-slate-400"
                    }`}
                  >
                    {auditDetails.leadStatus.replace("_", " ")}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Customer Sentiment score</span>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-950 border border-slate-850 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-700"
                        style={{ width: `${auditDetails.sentimentScore}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-indigo-400">{auditDetails.sentimentScore}%</span>
                  </div>
                </div>

                {auditDetails.appointmentBooked && (
                  <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/60 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={12} className="text-amber-400 animate-pulse" />
                      Meeting Scheduled
                    </span>
                    {auditDetails.appointmentDateTime && (
                      <p className="text-xs text-slate-200">
                        Confirmed for: {new Date(auditDetails.appointmentDateTime!).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">AI Executive Summary</span>
                  <p className="text-xs text-slate-350 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-850">
                    {auditDetails.summary}
                  </p>
                </div>

                <button
                  onClick={() => setCallState("idle")}
                  className="w-full py-2.5 text-xs font-semibold rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-slate-100 transition-all"
                >
                  Return to Active Queue
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 text-xs space-y-3">
                <PhoneCall size={24} className="text-slate-650" />
                <p>Call results audit will populate here once a simulated dial completes.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ACTIVE CALL SCREEN WRAPPER */
        <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[560px] animate-zoom-in">
          {/* Active Call Header details */}
          <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex justify-between items-center text-xs">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span className="font-semibold text-slate-400">
                {useTwilioCall
                  ? `Live Telephony Call (Twilio) • Active Session`
                  : callState === "ringing"
                  ? "Ringing Outbound..."
                  : `Active Call: ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`}
              </span>
            </div>
            <div className="text-slate-500 font-medium">Language: {campaigns.find(c => c.id === selectedCampaignId)?.language}</div>
          </div>

          {/* Core Call Screen Display */}
          <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden">
            {/* Left Screen: Phone graphic & waveform */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 relative bg-slate-950/20">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-6 rounded-full border bg-slate-900 ${
                  callState === "connected" ? "border-indigo-500/50 shadow-2xl shadow-indigo-900/20 animate-pulse" : "border-slate-850 animate-bounce"
                }`}>
                  {useTwilioCall ? <Smartphone className="text-indigo-400 animate-pulse" size={32} /> : <PhoneCall className="text-indigo-400" size={32} />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">{activeCustomer?.name}</h2>
                  <p className="text-xs text-slate-500 font-mono mt-1">{activeCustomer?.phone}</p>
                </div>
              </div>

              {/* Warnings and setup notifications for Twilio */}
              {useTwilioCall ? (
                <div className="mt-8 p-3.5 bg-indigo-950/20 border border-indigo-900/30 rounded-xl max-w-xs text-center space-y-1">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Live Calling Mode</span>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    AI is speaking on their mobile phone. Dialogue transcript will update on screen below as they talk.
                  </p>
                </div>
              ) : (
                /* Glowing Waveform Visualization */
                <div className="h-24 w-full flex items-center justify-center gap-1.5 mt-8 px-8">
                  {callState === "connected" && (
                    Array.from({ length: 15 }).map((_, idx) => (
                      <span
                        key={idx}
                        className={`w-1.5 bg-indigo-500 rounded-full transition-all duration-300 ${
                          isAiSpeaking ? "animate-pulse" : "h-2"
                        }`}
                        style={{
                          height: isAiSpeaking ? `${Math.max(12, Math.random() * 80)}px` : "8px",
                          animationDelay: `${idx * 80}ms`
                        }}
                      ></span>
                    ))
                  )}
                  {callState === "ringing" && (
                    <p className="text-xs text-indigo-400 animate-pulse font-medium">Waiting for customer to answer...</p>
                  )}
                </div>
              )}
            </div>

            {/* Right Screen: Conversation Transcripts */}
            <div className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-950/50">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-550 text-xs italic">
                    {useTwilioCall ? "Outbound phone dialing initiated... waiting to connect." : "Connection line establishing..."}
                  </div>
                ) : (
                  messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${
                        m.role === "ai" ? "items-start" : "items-end"
                      } animate-fade-in`}
                    >
                      <span className="text-[9px] text-slate-500 mb-1 font-semibold uppercase">
                        {m.role === "ai" ? "AI ASSISTANT (Vani)" : "CUSTOMER"}
                      </span>
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          m.role === "ai"
                            ? "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                            : "bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-900/10"
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))
                )}
                {isAiSpeaking && !useTwilioCall && (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold uppercase tracking-wider animate-pulse pt-2">
                    <Volume2 size={13} />
                    AI Assistant Speaking...
                  </div>
                )}
              </div>

              {/* Action Controls & Input */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
                {useTwilioCall ? (
                  /* Twilio Control Box */
                  <div className="text-center p-3 border border-slate-800 bg-slate-950/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>Real-time Call Progress</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      To end the call, simply hang up on your physical device. The web dashboard will automatically detect termination and render summaries.
                    </p>
                  </div>
                ) : (
                  /* Browser Mode Controls */
                  <div className="flex items-center gap-2">
                    <button
                      onClick={startVoiceListening}
                      disabled={isListening || isAiSpeaking || callState !== "connected"}
                      className={`p-2.5 rounded-xl border text-white transition-all duration-200 ${
                        isListening
                          ? "bg-emerald-600 border-emerald-500 animate-pulse"
                          : "bg-slate-950 border-slate-800 hover:bg-slate-850 hover:text-indigo-400"
                      }`}
                      title={isListening ? "Listening..." : "Click to Speak"}
                    >
                      <Mic size={15} />
                    </button>

                    <input
                      type="text"
                      disabled={callState !== "connected" || isAiSpeaking}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        isAiSpeaking
                          ? "AI Speaking - Please wait..."
                          : "Type response (or click Mic to speak)..."
                      }
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-105 placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-xs disabled:opacity-55"
                    />
                    
                    <button
                      onClick={() => handleSendCustomerMessage(textInput)}
                      disabled={callState !== "connected" || isAiSpeaking || !textInput.trim()}
                      className="p-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white disabled:opacity-50 transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                )}

                {/* Hang up controller (only for Browser mode; Twilio handles hangup natively, but we include a failsafe abort trigger) */}
                <button
                  onClick={useTwilioCall ? () => {
                    if (pollingIntervalRef.current) {
                      clearInterval(pollingIntervalRef.current);
                      pollingIntervalRef.current = null;
                    }
                    setCallState("idle");
                    setActiveCustomer(null);
                    setActiveCallLogId(null);
                  } : hangUpCall}
                  disabled={useTwilioCall ? false : (callState !== "connected")}
                  className="w-full py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/20 transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PhoneOff size={14} />
                  {useTwilioCall ? "Abort Monitor Panel" : "End Call (Hang Up)"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM WARNING MODAL DIALOG OVERLAY */}
      {errorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div onClick={() => setErrorModal(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>

          {/* Modal Box */}
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-4 animate-zoom-in">
            <div className="mx-auto h-12 w-12 rounded-full bg-rose-950/30 border border-rose-900 flex items-center justify-center text-rose-455">
              <XCircle size={24} />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-slate-100">{errorModal.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{errorModal.message}</p>
            </div>

            <button
              onClick={() => setErrorModal(null)}
              className="w-full py-2 text-xs font-bold text-white rounded-xl bg-indigo-650 hover:bg-indigo-600 shadow-md transition-colors"
            >
              Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
