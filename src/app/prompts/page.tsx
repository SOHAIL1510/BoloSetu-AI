"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  ChevronRight,
  Eye,
  FileCode,
  Save,
  Sparkles,
  Info
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  systemPrompt: string;
}

interface Customer {
  id: string;
  name: string;
  company: string | null;
  city: string | null;
  product: string | null;
  notes: string | null;
}

export default function PromptBuilder() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [activePrompt, setActivePrompt] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [interpolatedPrompt, setInterpolatedPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch campaigns and customers
  async function loadData() {
    try {
      const campRes = await fetch("/api/campaigns");
      if (campRes.ok) {
        const campData = await campRes.json();
        setCampaigns(campData);
        if (campData.length > 0) {
          setSelectedCampaignId(campData[0].id);
          setActivePrompt(campData[0].systemPrompt);
        }
      }

      const custRes = await fetch("/api/customers");
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(custData);
        if (custData.length > 0) {
          setSelectedCustomerId(custData[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Update prompt editor when selected campaign changes
  const handleCampaignChange = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (campaign) {
      setActivePrompt(campaign.systemPrompt);
      // Reset preview
      setInterpolatedPrompt("");
    }
  };

  // Save prompt back to campaign
  const savePrompt = async () => {
    if (!selectedCampaignId) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/campaigns/${selectedCampaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: activePrompt }),
      });
      if (res.ok) {
        // Refresh campaigns
        const updatedCampRes = await fetch("/api/campaigns");
        if (updatedCampRes.ok) {
          const updatedCamps = await updatedCampRes.json();
          setCampaigns(updatedCamps);
        }
        alert("Prompt template updated successfully!");
      }
    } catch (err) {
      console.error("Error saving prompt:", err);
    } finally {
      setSaving(false);
    }
  };

  // Variable Injection Handler
  const injectTag = (tag: string) => {
    const textarea = document.getElementById("prompt-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = activePrompt;
    const newText = currentText.substring(0, start) + tag + currentText.substring(end);
    setActivePrompt(newText);
    
    // Reset focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 10);
  };

  // Process and interpolate template tags
  const runInterpolationTest = () => {
    if (!selectedCustomerId) {
      alert("Please select a test customer first!");
      return;
    }
    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) return;

    let compiled = activePrompt;
    compiled = compiled.replace(/\{\{customer_name\}\}/gi, customer.name || "Customer");
    compiled = compiled.replace(/\{\{city\}\}/gi, customer.city || "your city");
    compiled = compiled.replace(/\{\{company\}\}/gi, customer.company || "your company");
    compiled = compiled.replace(/\{\{product\}\}/gi, customer.product || "our services");
    compiled = compiled.replace(/\{\{notes\}\}/gi, customer.notes || "previous conversations");

    setInterpolatedPrompt(compiled);
  };

  const tags = [
    { name: "Customer Name", value: "{{customer_name}}" },
    { name: "City", value: "{{city}}" },
    { name: "Company", value: "{{company}}" },
    { name: "Interest Product", value: "{{product}}" },
    { name: "Notes", value: "{{notes}}" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="text-indigo-400" size={22} />
          AI Prompt Builder
        </h1>
        <p className="text-xs text-slate-400 mt-1">Design and test natural outbound dialogue scripts containing variable fields.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Side */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Select Campaign Prompt</label>
              <select
                value={selectedCampaignId}
                onChange={(e) => handleCampaignChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs sm:w-64"
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

            {/* Quick Variable Tags */}
            <div>
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Click to Inject Template Tags</span>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => injectTag(tag.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-850 hover:border-indigo-500 hover:bg-slate-900 text-indigo-400 hover:text-indigo-300 font-mono text-xs transition-all flex items-center gap-1.5"
                  >
                    <span>{tag.value}</span>
                    <span className="text-[10px] text-slate-500 normal-case">({tag.name})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor Area */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">System Instructions Prompt Editor</label>
              <textarea
                id="prompt-textarea"
                rows={12}
                value={activePrompt}
                onChange={(e) => setActivePrompt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-sm font-mono leading-relaxed"
                placeholder="Enter AI calling scripts..."
              />
            </div>
          </div>

          <button
            onClick={savePrompt}
            disabled={saving || !selectedCampaignId}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg disabled:opacity-50 transition-all"
          >
            <Save size={16} />
            {saving ? "Saving Changes..." : "Save Prompt Template"}
          </button>
        </div>

        {/* Test Bench Preview Side */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-slate-350 flex items-center gap-2">
              <Eye size={16} className="text-indigo-400" />
              Live Prompt Compiler Test Bench
            </h3>

            {/* Select Test Customer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-amber-400" />
                <span className="text-xs text-slate-450 font-medium">Select a customer record to test variable values</span>
              </div>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs sm:w-48"
              >
                {customers.length === 0 ? (
                  <option value="">No customer leads found</option>
                ) : (
                  customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                )}
              </select>
            </div>

            {/* Test Compilation Button */}
            <button
              onClick={runInterpolationTest}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl bg-indigo-950/40 border border-indigo-900/50 hover:bg-indigo-900/40 text-indigo-400 hover:text-indigo-300 transition-all"
            >
              <Sparkles size={14} />
              Compile & Preview Interpolation
            </button>

            {/* Result Box */}
            <div className="space-y-2">
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Compiled Output Preview</span>
              <div className="w-full p-4 rounded-xl bg-slate-950 border border-slate-850 text-slate-300 text-sm font-mono leading-relaxed min-h-[220px] max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                {interpolatedPrompt ? (
                  interpolatedPrompt
                ) : (
                  <span className="text-slate-600 italic">Click "Compile & Preview Interpolation" to run preview.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
