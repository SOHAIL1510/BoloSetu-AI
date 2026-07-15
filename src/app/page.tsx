"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import LandingPage from "@/components/LandingPage";
import {
  Users,
  PhoneCall,
  PhoneOff,
  UserCheck,
  CalendarCheck,
  Clock,
  TrendingUp,
  Activity,
  Heart,
  Calendar,
  PhoneIncoming,
  RefreshCcw,
  Sparkles,
  Megaphone
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface DashboardData {
  stats: {
    totalCustomers: number;
    callsCompleted: number;
    callsPending: number;
    callsFailed: number;
    interestedLeads: number;
    followUpRequired: number;
    appointmentsBooked: number;
    averageCallDuration: number;
    averageSentiment: number;
    successRate: number;
    conversionRate: number;
  };
  notifications: any[];
  charts: {
    dailyCalls: any[];
    hourlyCalls: any[];
    leadConversion: any[];
    customerSentiment: any[];
    campaignPerformance: any[];
  };
}

export default function Dashboard() {
  const { status } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function fetchStats() {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/dashboard-stats");
      if (res.ok) {
        const statsData = await res.json();
        setData(statsData);
      }
    } catch (err) {
      console.error("Error loading dashboard statistics:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchStats();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-10 w-10 border-4 border-t-indigo-500 border-r-indigo-500 border-b-slate-800 border-l-slate-800 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase">Loading BoloSetu AI...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <LandingPage />;
  }

  if (!data) return <div className="p-6 text-slate-400">Failed to load console statistics. Please refresh.</div>;

  const { stats, charts } = data;
  const COLORS = ["#6366f1", "#a855f7", "#ef4444"]; // Indigo, Purple, Rose

  const statCards = [
    { name: "Total Leads", value: stats.totalCustomers, icon: Users, color: "text-indigo-400", bg: "bg-indigo-950/20 border-indigo-900/50" },
    { name: "Calls Completed", value: stats.callsCompleted, icon: PhoneCall, color: "text-emerald-400", bg: "bg-emerald-950/20 border-emerald-900/50" },
    { name: "Calls Pending", value: stats.callsPending, icon: Activity, color: "text-amber-400", bg: "bg-amber-950/20 border-amber-900/50" },
    { name: "Calls Failed", value: stats.callsFailed, icon: PhoneOff, color: "text-rose-400", bg: "bg-rose-950/20 border-rose-900/50" },
    { name: "Interested Leads", value: stats.interestedLeads, icon: UserCheck, color: "text-violet-400", bg: "bg-violet-950/20 border-violet-900/50" },
    { name: "Follow-up Calls", value: stats.followUpRequired, icon: PhoneIncoming, color: "text-cyan-400", bg: "bg-cyan-950/20 border-cyan-900/50" },
    { name: "Appointments Booked", value: stats.appointmentsBooked, icon: CalendarCheck, color: "text-fuchsia-400", bg: "bg-fuchsia-950/20 border-fuchsia-900/50" },
    { name: "Avg Call Duration", value: `${stats.averageCallDuration}s`, icon: Clock, color: "text-pink-400", bg: "bg-pink-950/20 border-pink-900/50" },
    { name: "AI Sentiment Score", value: `${stats.averageSentiment}%`, icon: Heart, color: "text-sky-400", bg: "bg-sky-950/20 border-sky-900/50" },
    { name: "Success Rate", value: `${stats.successRate}%`, icon: TrendingUp, color: "text-teal-400", bg: "bg-teal-950/20 border-teal-900/50" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
            Welcome Back, Telecalling Admin <Sparkles size={20} className="text-amber-400" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time outbound campaign analytics, AI conversations, and lead conversions.
          </p>
        </div>
        <div>
          <button
            onClick={fetchStats}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 transition-all disabled:opacity-50"
          >
            <RefreshCcw size={16} className={isRefreshing ? "animate-spin" : ""} />
            Refresh Stats
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.name}
              className={`p-5 rounded-2xl border ${card.bg} flex flex-col justify-between transition-all duration-300 hover:scale-102 hover:shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-450 uppercase tracking-wider">{card.name}</span>
                <Icon className={card.color} size={18} />
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold text-slate-100 tracking-tight">{card.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily call charts */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl lg:col-span-2">
          <h3 className="font-semibold text-sm text-slate-350 mb-6 flex items-center gap-2">
            <Activity size={16} className="text-indigo-400" />
            Daily Call Volume (Last 7 Days)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.dailyCalls}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                />
                <Bar dataKey="calls" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Analysis */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <h3 className="font-semibold text-sm text-slate-350 mb-6 flex items-center gap-2">
            <Heart size={16} className="text-rose-400" />
            Customer Sentiment Distribution
          </h3>
          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.customerSentiment}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {charts.customerSentiment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center stat */}
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-extrabold text-slate-100">{stats.averageSentiment}%</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Avg Positivity</span>
            </div>
          </div>
          {/* Legend */}
          <div className="flex justify-center gap-4 mt-2">
            {charts.customerSentiment.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx] }}></span>
                <span>{item.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Volume */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <h3 className="font-semibold text-sm text-slate-350 mb-6 flex items-center gap-2">
            <Clock size={16} className="text-amber-400" />
            Hourly Distribution (Today)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.hourlyCalls}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                />
                <Line type="monotone" dataKey="calls" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Funnel */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <h3 className="font-semibold text-sm text-slate-350 mb-6 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" />
            Lead Qualification Funnel
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.leadConversion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                />
                <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Campaign Performance Comparison */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <h3 className="font-semibold text-sm text-slate-350 mb-6 flex items-center gap-2">
          <Megaphone size={16} className="text-indigo-400" />
          Active Campaign Lead Ingestion Comparison
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.campaignPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
              <Bar dataKey="completed" name="Calls Placed" fill="#6366f1" radius={[3, 3, 0, 0]} barSize={16} />
              <Bar dataKey="interested" name="Qualified Leads" fill="#a855f7" radius={[3, 3, 0, 0]} barSize={16} />
              <Bar dataKey="appointments" name="Meetings Booked" fill="#eab308" radius={[3, 3, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
