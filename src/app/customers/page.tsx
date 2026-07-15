"use client";

import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import {
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  Users,
  Search,
  ChevronRight,
  Database,
  Building,
  MapPin,
  Sparkles
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  city: string | null;
  product: string | null;
  status: string;
  campaign: { name: string };
}

export default function CustomerImport() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // File Upload State
  const [fileName, setFileName] = useState("");
  const [importStats, setImportStats] = useState<{
    totalRows: number;
    imported: number;
    failed: number;
  } | null>(null);
  const [importErrors, setImportErrors] = useState<{ row: number; name: string; phone: string; reason: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Search Filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Load campaigns and existing customers
  async function loadData() {
    try {
      const campRes = await fetch("/api/campaigns");
      if (campRes.ok) {
        const campData = await campRes.json();
        setCampaigns(campData);
        if (campData.length > 0) setSelectedCampaignId(campData[0].id);
      }

      const custRes = await fetch("/api/customers");
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(custData);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Download Sample CSV Helper
  const downloadTemplate = () => {
    const csvContent =
      "Name,Phone Number,Email,Company,City,Product Interested,Previous Interaction,Notes\n" +
      "Arjun Mehta,+919876543210,arjun@company.com,Mehta Tech,Mumbai,Python BootCamp,Signed up on website,High intent lead\n" +
      "Sneha Rao,9812345678,sneha@gmail.com,Student,Delhi,React Training,,Wants morning batch\n" +
      "John Doe,,john@doe.com,,,Data Science,,INVALID ROW (MISSING PHONE)\n" +
      "Priya Patel,+919812345678,priya@yahoo.com,TCS,Mumbai,Full Stack Development,,DUPLICATE ROW (SAME AS PRIYA IN SEED DATA)";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "bolosetu_customer_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV File Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportStats(null);
    setImportErrors([]);

    if (!selectedCampaignId) {
      alert("Please select a target campaign first!");
      return;
    }

    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const response = await fetch("/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignId: selectedCampaignId,
              customers: results.data,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setImportStats(data.stats);
            setImportErrors(data.errors);
            // Refresh customer listings
            loadData();
          } else {
            const errData = await response.json();
            alert(`Error: ${errData.error}`);
          }
        } catch (err: any) {
          alert(`Network upload failed: ${err.message}`);
        } finally {
          setIsUploading(false);
        }
      },
    });
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="text-indigo-400" size={22} />
            Customer Leads Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">Upload calling batches, review validation outputs, and search active customer queues.</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 transition-all"
        >
          <Download size={15} />
          Download CSV Template
        </button>
      </div>

      {/* Upload Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl lg:col-span-2 space-y-6">
          <h3 className="font-semibold text-sm text-slate-350 flex items-center gap-2">
            <Upload size={16} className="text-indigo-400" />
            Ingest Outbound Calling Batch (CSV)
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Assign to Campaign</label>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full sm:max-w-md px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
              >
                {campaigns.length === 0 ? (
                  <option value="">No campaigns available - Create one first!</option>
                ) : (
                  campaigns.map((camp) => (
                    <option key={camp.id} value={camp.id}>{camp.name}</option>
                  ))
                )}
              </select>
            </div>

            {/* Drag and Drop Zone */}
            <div className="relative border-2 border-dashed border-slate-850 hover:border-indigo-500/50 rounded-2xl p-10 text-center transition-colors group cursor-pointer bg-slate-950/20">
              <input
                type="file"
                accept=".csv"
                disabled={campaigns.length === 0}
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="bg-slate-855 p-3 rounded-full text-slate-400 group-hover:text-indigo-400 transition-colors">
                  <Upload size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {isUploading ? "Uploading & Ingesting..." : fileName || "Select or Drag CSV file"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Accepts standard .csv formats up to 10MB</p>
                </div>
              </div>
            </div>
          </div>

          {/* Import Statistics Diagnostics */}
          {importStats && (
            <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-850 space-y-4 animate-fade-in">
              <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Upload Diagnostics Result</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Rows Processed</p>
                  <p className="text-lg font-bold text-slate-200 mt-1">{importStats.totalRows}</p>
                </div>
                <div className="p-3 bg-emerald-950/25 border border-emerald-900/40 rounded-lg">
                  <p className="text-[10px] text-emerald-500 font-bold uppercase">Ingested Successfully</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">{importStats.imported}</p>
                </div>
                <div className="p-3 bg-rose-950/25 border border-rose-900/40 rounded-lg">
                  <p className="text-[10px] text-rose-500 font-bold uppercase">Validation Failed</p>
                  <p className="text-lg font-bold text-rose-400 mt-1">{importStats.failed}</p>
                </div>
              </div>

              {/* Errors report */}
              {importErrors.length > 0 && (
                <div className="space-y-2 mt-4 max-h-[220px] overflow-y-auto pr-1">
                  <p className="text-xs font-semibold text-rose-450 flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    Failed Rows Diagnostic Logs:
                  </p>
                  <div className="divide-y divide-slate-900 border border-slate-900 rounded-lg overflow-hidden text-xs">
                    {importErrors.map((err, idx) => (
                      <div key={idx} className="p-3 bg-slate-900 flex justify-between gap-4">
                        <div>
                          <span className="text-[10px] bg-rose-950 text-rose-400 px-1.5 py-0.5 rounded mr-2 font-mono">Row {err.row}</span>
                          <span className="font-semibold text-slate-200">{err.name || "Unknown"}</span>
                          <span className="text-slate-500 font-mono ml-2">({err.phone || "No phone"})</span>
                        </div>
                        <span className="text-rose-400 text-xs">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <h3 className="font-semibold text-sm text-slate-350 flex items-center gap-2">
            <Sparkles size={15} className="text-amber-400" />
            Ingestion Pipeline Rules
          </h3>
          <ul className="text-xs text-slate-400 space-y-3 list-disc pl-4 leading-relaxed">
            <li><strong>Required Headers</strong>: Make sure the file matches the headers of our downloadable template.</li>
            <li><strong>Phone Numbers</strong>: Checked for standard lengths (9-15 digits). Automatically stripped of whitespace or parentheses.</li>
            <li><strong>Duplicate Checker</strong>: Duplicate phone entries are filtered out within the batch. Additionally, we cross-reference the campaign database to prevent duplicates.</li>
            <li><strong>AI Ready</strong>: Imported entries are placed in the calling queue with "PENDING" status, ready for the Call Simulator.</li>
          </ul>
        </div>
      </div>

      {/* Customer Leads Listings */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="font-semibold text-sm text-slate-350 flex items-center gap-2">
            <Database size={16} className="text-indigo-400" />
            Customer Leads Queue ({filteredCustomers.length})
          </h3>

          {/* Search box */}
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              placeholder="Search leads by name, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-850 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
            />
            <Search className="absolute left-3.5 top-3.5 text-slate-600" size={13} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs border border-slate-850 rounded-xl bg-slate-950/20">
            No customer leads found matching queries.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-4">Lead Name</th>
                  <th className="pb-3 px-4">Phone Number</th>
                  <th className="pb-3 px-4">Campaign</th>
                  <th className="pb-3 px-4">Company & City</th>
                  <th className="pb-3 px-4">Interest Product</th>
                  <th className="pb-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-950/40 transition-colors group">
                    <td className="py-3 px-4 font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                      {cust.name}
                      {cust.email && <span className="block text-[10px] text-slate-500 font-medium normal-case mt-0.5">{cust.email}</span>}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{cust.phone}</td>
                    <td className="py-3 px-4 text-slate-350 font-medium">{cust.campaign.name}</td>
                    <td className="py-3 px-4 text-slate-400">
                      <div className="flex items-center gap-1">
                        <Building size={11} className="text-slate-600" />
                        <span>{cust.company || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={11} className="text-slate-600" />
                        <span className="text-[10px] text-slate-500">{cust.city || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-indigo-300 font-medium">{cust.product || "—"}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide inline-block ${
                          cust.status === "COMPLETED"
                            ? "bg-emerald-950/40 border border-emerald-900 text-emerald-400"
                            : cust.status === "FAILED"
                            ? "bg-rose-950/40 border border-rose-900 text-rose-400"
                            : "bg-slate-800 border border-slate-700 text-slate-400"
                        }`}
                      >
                        {cust.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
