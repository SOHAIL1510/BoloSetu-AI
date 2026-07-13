"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  FileText,
  Trash2,
  Calendar,
  AlertTriangle,
  Upload,
  CheckCircle,
  HelpCircle,
  FolderOpen,
  Loader2
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
}

interface KnowledgeDocument {
  id: string;
  name: string;
  fileType: string;
  contentText: string;
  campaignId: string | null;
  createdAt: string;
  campaign: { name: string } | null;
}

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [fileType, setFileType] = useState("faq");
  const [contentText, setContentText] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [saving, setSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // Load documents and campaigns
  async function loadData() {
    try {
      const docRes = await fetch("/api/knowledge-base");
      if (docRes.ok) {
        const docData = await docRes.json();
        setDocuments(docData);
      }

      const campRes = await fetch("/api/campaigns");
      if (campRes.ok) {
        const campData = await campRes.json();
        setCampaigns(campData);
      }
    } catch (err) {
      console.error("Error loading knowledge-base:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Handle document deletion
  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this document from the knowledge base?")) return;
    try {
      const delRes = await fetch(`/api/knowledge-base`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (delRes.ok) loadData();
    } catch (err) {
      console.error("Error deleting document:", err);
    }
  }

  // Handle document submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !contentText) return;

    try {
      setSaving(true);
      const res = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          fileType,
          contentText,
          campaignId: campaignId || null,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setName("");
        setContentText("");
        setCampaignId("");
        loadData();
      }
    } catch (err) {
      console.error("Error saving document:", err);
    } finally {
      setSaving(false);
    }
  }

  // Dynamically load PDF.js from cdnjs
  const loadPdfJS = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        const pdfjs = (window as any).pdfjsLib;
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(pdfjs);
      };
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  };

  // Extract readable text from selected PDF binary buffer
  const parsePdfFile = async (file: File): Promise<string> => {
    const pdfjs = await loadPdfJS();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    
    return fullText.trim();
  };

  // File reader supporting PDF, TXT, and MD files
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setName(file.name.split(".")[0]);
    const extension = file.name.split(".").pop()?.toLowerCase();
    setFileType(extension === "md" ? "md" : extension === "pdf" ? "pdf" : "txt");

    if (extension === "pdf") {
      try {
        setIsExtracting(true);
        setContentText("");
        const extractedText = await parsePdfFile(file);
        setContentText(extractedText);
      } catch (err) {
        console.error("Error parsing PDF document:", err);
        alert("Failed to parse PDF file. Ensure the PDF is not encrypted or scanner-only image-based (it must contain digital text).");
      } finally {
        setIsExtracting(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === "string") {
          setContentText(text);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="text-indigo-400" size={22} />
            Knowledge Base (RAG)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Feed guidelines, brochures, and policy lists for the AI to query contextually.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg transition-all"
        >
          <Plus size={16} />
          Add Document
        </button>
      </div>

      {/* Docs Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 space-y-3">
          <FolderOpen size={32} className="mx-auto text-slate-700" />
          <p>No knowledge documents found. Ingest a document to start grounding your AI conversations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all duration-300 relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-indigo-400 uppercase tracking-wider">
                    {doc.fileType}
                  </span>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-500 hover:bg-slate-850 hover:text-rose-400 transition-all"
                    title="Remove Document"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <h3 className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                  <FileText size={16} className="text-slate-500" />
                  {doc.name}
                </h3>
                <p className="text-xs text-slate-400 mt-2 line-clamp-4 leading-relaxed font-mono bg-slate-950 p-3 rounded-lg border border-slate-850">
                  {doc.contentText}
                </p>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-850 mt-4 pt-3 flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase">
                <span>Associated: {doc.campaign?.name || "Global / All"}</span>
                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload/Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>

          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
              <h2 className="font-bold text-slate-100 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-400" />
                Ingest Grounding Document
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              {/* File Uploader */}
              <div className="border-2 border-dashed border-slate-850 hover:border-indigo-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-950/20 relative group">
                <input
                  type="file"
                  accept=".txt,.md,.json,.pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-2">
                  {isExtracting ? (
                    <>
                      <Loader2 size={24} className="text-indigo-400 animate-spin" />
                      <p className="text-xs font-semibold text-indigo-400">Extracting PDF Text Content...</p>
                    </>
                  ) : (
                    <>
                      <Upload size={20} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                      <p className="text-xs font-semibold text-slate-200">Load from file (.pdf, .txt, .md, .json)</p>
                      <p className="text-[10px] text-slate-550">Or fill details manually below</p>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Document Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Refund Policy FAQ"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Doc Type</label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value="faq">FAQ</option>
                    <option value="pdf">PDF Document (.pdf)</option>
                    <option value="txt">Plain Text (.txt)</option>
                    <option value="md">Markdown (.md)</option>
                    <option value="brochure">Brochure</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Link to Campaign</label>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="">Global (All campaigns utilize this)</option>
                  {campaigns.map((camp) => (
                    <option key={camp.id} value={camp.id}>{camp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Document Text Content *</label>
                <textarea
                  required
                  rows={8}
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  placeholder="Paste FAQ questions and answers, brochure details, course structures, or other policies here..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm font-mono leading-relaxed"
                />
              </div>

              <div className="border-t border-slate-850 pt-4 mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-850 border border-slate-800 text-slate-350 hover:bg-slate-800 hover:text-slate-100 text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || isExtracting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-purple-500 shadow-lg disabled:opacity-50 transition-all"
                >
                  {saving ? "Ingesting..." : "Ingest Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
