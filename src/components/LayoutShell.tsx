"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Cpu,
  PhoneCall,
  BookOpen,
  History,
  Settings as SettingsIcon,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Menu,
  X,
  Phone,
  LogOut,
  User as UserIcon
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // If we are on login, register, or unauthenticated landing page, do not render any layout shell elements
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register") || (pathname === "/" && status === "unauthenticated");

  // Load notifications from the dashboard stats endpoint
  useEffect(() => {
    if (isAuthPage) return;

    async function loadNotifications() {
      try {
        const res = await fetch("/api/dashboard-stats");
        if (res.ok) {
          const data = await res.json();
          if (data.notifications) {
            setNotifications(data.notifications);
            setUnreadCount(data.notifications.filter((n: Notification) => !n.isRead).length);
          }
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    }
    loadNotifications();

    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [isAuthPage]);

  if (isAuthPage) {
    return <div className="h-full w-full">{children}</div>;
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Campaigns", href: "/campaigns", icon: Megaphone },
    { name: "Customer Import", href: "/customers", icon: Users },
    { name: "AI Prompt Builder", href: "/prompts", icon: Cpu },
    { name: "Call Simulator", href: "/simulator", icon: PhoneCall },
    { name: "Knowledge Base (RAG)", href: "/knowledge-base", icon: BookOpen },
    { name: "Call Logs", href: "/logs", icon: History },
    { name: "Settings", href: "/settings", icon: SettingsIcon },
  ];

  const userOrgName = (session?.user as any)?.organizationName || "My Workspace";
  const userDisplayName = session?.user?.name || session?.user?.email || "Workspace User";

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-slate-900 border-r border-slate-800">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Phone size={20} className="transform -rotate-12" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wider bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase">
              Vani AI
            </h1>
            <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">{userOrgName}</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-900/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                }`}
              >
                <Icon
                  size={18}
                  className={`transition-transform duration-300 group-hover:scale-110 ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-400"
                  }`}
                />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Identity / Logout Area */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800/80">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="h-7 w-7 rounded-lg bg-indigo-950 border border-indigo-900/60 flex items-center justify-center text-indigo-400 text-xs font-bold shrink-0">
                <UserIcon size={14} />
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-xs font-bold text-slate-200 truncate leading-tight">{userDisplayName}</p>
                <p className="text-[9px] text-slate-500 font-semibold truncate leading-none uppercase mt-0.5">Admin</p>
              </div>
            </div>
            
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-955/20 transition-all cursor-pointer"
              title="Logout Account"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-10">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <Menu size={20} />
          </button>

          {/* Navigation Title */}
          <div className="hidden md:block">
            <h2 className="text-lg font-semibold text-slate-200">
              {navItems.find((item) => item.href === pathname)?.name || "Vani AI"}
            </h2>
          </div>

          <div className="md:hidden font-bold text-indigo-400 tracking-wider">VANI AI</div>

          {/* Topbar Actions */}
          <div className="flex items-center gap-4">
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-800/60">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs text-emerald-400 font-medium">Simulator Online</span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-800/80 hover:text-slate-100 relative transition-colors duration-200"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-slate-900 animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Drawer */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-850 border-b border-slate-800">
                    <span className="font-semibold text-sm">Notifications</span>
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-sm">No new alerts</div>
                    ) : (
                      notifications.map((n) => {
                        const isSuccess = n.type === "SUCCESS";
                        const isWarning = n.type === "WARNING";
                        return (
                          <div
                            key={n.id}
                            className={`p-4 flex gap-3 transition-colors ${
                              n.isRead ? "bg-slate-900/50" : "bg-slate-800/20"
                            }`}
                          >
                            <div className="mt-0.5">
                              {isSuccess ? (
                                <CheckCircle2 className="text-emerald-500" size={16} />
                              ) : isWarning ? (
                                <AlertTriangle className="text-amber-500" size={16} />
                              ) : (
                                <Info className="text-indigo-400" size={16} />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-slate-200">{n.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                              <p className="text-[10px] text-slate-550 mt-1">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Pane */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6 md:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Menu Backdrop & Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 flex z-50 md:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          ></div>

          {/* Drawer Menu */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 border-r border-slate-800 transform transition-transform duration-300">
            <div className="absolute top-0 right-0 -mr-12 pt-4">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <X className="text-white" size={24} />
              </button>
            </div>

            <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
              <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <Phone size={20} className="transform -rotate-12" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-wider text-slate-100 uppercase">Vani AI</h1>
                <p className="text-[8px] text-indigo-400 font-bold uppercase tracking-wider">{userOrgName}</p>
              </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="h-7 w-7 rounded-lg bg-indigo-950 border border-indigo-900/60 flex items-center justify-center text-indigo-400 text-xs font-bold shrink-0">
                    <UserIcon size={14} />
                  </div>
                  <div className="text-left overflow-hidden">
                    <p className="text-xs font-bold text-slate-200 truncate">{userDisplayName}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
