/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  HistoryItem, 
  ModelStats, 
  SummaryStats, 
  AnalysisResponse 
} from "./types";

// Component Panel Imports
import DashboardCom from "./components/Dashboard";
import AnalyzerCom from "./components/Analyzer";
import BulkAnalyzerCom from "./components/BulkAnalyzer";
import MlLabCom from "./components/MlLab";
import HistoryListCom from "./components/HistoryList";
import CodeExporterCom from "./components/CodeExporter";

// Lucide Icons
import {
  Sparkles,
  BarChart3,
  Sliders,
  UploadCloud,
  FileText,
  History,
  Terminal,
  Sun,
  Moon,
  Fingerprint,
  Server,
  BookOpen
} from "lucide-react";

export default function App() {
  // Theme and routing
  const [activeTab, setActiveTab] = useState<"dashboard" | "analyzer" | "bulk" | "mllab" | "history" | "code">("dashboard");
  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");
  
  // Data State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [modelStats, setModelStats] = useState<ModelStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<SummaryStats | null>(null);
  const [aiInsights, setAiInsights] = useState("Click 'Generate AI Strategic Briefing' above to unlock Gemini strategic insights.");
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  // Filtering & Querying States
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("");
  
  // Async Loading States
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingMl, setLoadingMl] = useState(false);

  // Initialize Dark/Light Mode Class on mount
  useEffect(() => {
    const root = window.document.documentElement;
    if (themeMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [themeMode]);

  // Initial Fetches on Mount
  useEffect(() => {
    fetchHistory();
    fetchStats();
    fetchModelStats();
  }, []);

  // Sync fetches when tabs or actions occur
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (sentimentFilter) queryParams.append("sentiment", sentimentFilter);

      const resp = await fetch(`/api/history?${queryParams.toString()}`);
      if (resp.ok) {
        const data = await resp.json();
        setHistory(data);
      }
    } catch (e) {
      console.error("Failed to load sqlite analysis history data", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Trigger history search fetching when filters/queries change
  useEffect(() => {
    fetchHistory();
  }, [searchQuery, sentimentFilter]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const resp = await fetch("/api/history/stats");
      if (resp.ok) {
        const data = await resp.json();
        setDashboardStats(data);
      }
    } catch (e) {
       console.error("Failed to load dashboard core stats calculations", e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchModelStats = async () => {
    setLoadingMl(true);
    try {
      const resp = await fetch("/api/model/stats");
      if (resp.ok) {
        const data = await resp.json();
        setModelStats(data);
      }
    } catch (e) {
      console.error("Failed to fetch TF-IDF weights model metrics", e);
    } finally {
      setLoadingMl(false);
    }
  };

  const generateAiInsights = async () => {
    setLoadingInsights(true);
    setAiInsights("Synthesizing raw history files and consulting business heuristics with Gemini...");
    try {
      const resp = await fetch("/api/gemini/insights", {
        method: "POST"
      });
      if (resp.ok) {
        const data = await resp.json();
        setAiInsights(data.insights || "No insight responses generated.");
      } else {
        setAiInsights("Failed to trigger API response. Ensure server supports /api/gemini/insights.");
      }
    } catch (e) {
      setAiInsights("An exception occurred during Gemini insights compilation.");
      console.error(e);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Server API Actions
  const handleSingleAnalysis = async (
    text: string,
    generateSuggestions: boolean,
    source: string,
    tag: string
  ): Promise<AnalysisResponse | null> => {
    try {
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, generateSuggestions, source, tag })
      });
      if (resp.ok) {
        const payload: AnalysisResponse = await resp.json();
        // Refresh items list
        fetchHistory();
        fetchStats();
        return payload;
      }
    } catch (e) {
      console.error("Error invoking single text logic", e);
    }
    return null;
  };

  const handleBulkAnalysis = async (
    items: Array<{ text: string; source: string; tag: string }>
  ): Promise<HistoryItem[] | null> => {
    try {
      const resp = await fetch("/api/bulk-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      if (resp.ok) {
        const payload = await resp.json();
        fetchHistory();
        fetchStats();
        return payload.records || [];
      }
    } catch (e) {
      console.error("Error executing bulk reviews import list", e);
    }
    return null;
  };

  const handleDeleteItem = async (id: string): Promise<boolean> => {
    try {
      const resp = await fetch(`/api/history/${id}`, {
        method: "DELETE"
      });
      if (resp.ok) {
        fetchHistory();
        fetchStats();
        return true;
      }
    } catch (e) {
      console.error("Error deleting SQLite element row", e);
    }
    return false;
  };

  const handleClearHistory = async (): Promise<boolean> => {
    try {
      const resp = await fetch("/api/history/clear", {
        method: "POST"
      });
      if (resp.ok) {
        fetchHistory();
        fetchStats();
        return true;
      }
    } catch (e) {
      console.error("Error flushing whole SQLite database table", e);
    }
    return false;
  };

  const handleRetrainModel = async (dataset?: any, testRatio?: number): Promise<boolean> => {
    try {
      const resp = await fetch("/api/model/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testRatio })
      });
      if (resp.ok) {
        // Reload settings and scores
        fetchModelStats();
        return true;
      }
    } catch (e) {
       console.error("Error during SGD gradient retraining", e);
    }
    return false;
  };

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Full default statistics fallback values to prevent children dashboard breaks
  const fallbackStats: SummaryStats = {
    totalAnalyzed: 0,
    positiveCount: 0,
    negativeCount: 0,
    neutralCount: 0,
    averageScore: 0.0,
    positivePercentage: 0,
    negativePercentage: 0,
    neutralPercentage: 0
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300">
      
      {/* GEOMETRIC BALANCE SIDE NAVIGATION (DESKTOP) */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 text-slate-400 flex-col shrink-0">
        
        {/* Brand identity area */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-800 shrink-0">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/10">
            <Fingerprint className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-extrabold tracking-tight text-lg">Sentix.AI</span>
        </div>

        {/* Vertical routing navigation items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {/* Dashboard */}
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all w-full text-left cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <BarChart3 className="w-4.5 h-4.5 shrink-0" />
            <span>Dashboard</span>
          </button>

          {/* Predictor Sandbox */}
          <button
            onClick={() => setActiveTab("analyzer")}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all w-full text-left cursor-pointer ${
              activeTab === "analyzer"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <FileText className="w-4.5 h-4.5 shrink-0" />
            <span>Predictor Sandbox</span>
          </button>

          {/* Bulk CSV Upload */}
          <button
            onClick={() => setActiveTab("bulk")}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all w-full text-left cursor-pointer ${
              activeTab === "bulk"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <UploadCloud className="w-4.5 h-4.5 shrink-0" />
            <span>Bulk CSV Upload</span>
          </button>

          {/* Interactive ML Lab */}
          <button
            onClick={() => setActiveTab("mllab")}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all w-full text-left cursor-pointer ${
              activeTab === "mllab"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Sliders className="w-4.5 h-4.5 shrink-0" />
            <span>Interactive ML Lab</span>
          </button>

          {/* SQLite History folder */}
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all w-full text-left cursor-pointer ${
              activeTab === "history"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <History className="w-4.5 h-4.5 shrink-0" />
            <span>SQLite History Log</span>
          </button>

          {/* Python Code exporter */}
          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all w-full text-left cursor-pointer ${
              activeTab === "code"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Terminal className="w-4.5 h-4.5 shrink-0" />
            <span>Python Code Exporter</span>
          </button>
        </nav>

        {/* Sidebar Footer detailing model state */}
        <div className="p-5 border-t border-slate-800 shrink-0">
          <div className="bg-slate-800/70 p-4 rounded-xl text-xs text-slate-300 italic font-mono space-y-1.5 leading-relaxed">
            <span className="font-semibold text-slate-200">Model v2.4.1 Loaded</span>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400 font-sans">
              <span>Precision:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {modelStats ? `${(modelStats.accuracy * 100).toFixed(1)}%` : "92.4%"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* COMPACT RESPONSIVE TOP NAV (MOBILE / TABLET) */}
      <header className="flex md:hidden items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-500 rounded flex items-center justify-center">
            <Fingerprint className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-extrabold tracking-tight text-base">Sentix.AI</span>
        </div>
        
        {/* Simple selection dropdown representing tabs */}
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as any)}
          className="bg-slate-800 border-none text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white font-semibold"
        >
          <option value="dashboard">Dashboard</option>
          <option value="analyzer">Predictor Sandbox</option>
          <option value="bulk">Bulk CSV Upload</option>
          <option value="mllab">Interactive ML Lab</option>
          <option value="history">SQLite History Log</option>
          <option value="code">Python Code Exporter</option>
        </select>
      </header>

      {/* SECONDARY MAIN VIEW BLOCK FRAME */}
      <main className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
        
        {/* GLOBAL HEADER BAR */}
        <header className="h-16 flex items-center justify-between px-6 md:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/90 shadow-sm shrink-0 sticky top-0 z-35 transition-colors">
          
          {/* Universal query input in the header */}
          <div className="relative w-64 md:w-96 select-none">
            <input 
              type="text" 
              placeholder="Search previous reviews & metrics..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // switch to history trigger instantly if they started actively writing a query
                if (activeTab !== "history" && e.target.value) {
                  setActiveTab("history");
                }
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800/75 border-none rounded-full text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
            <svg className="w-4 h-4 absolute left-3 top-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>

          {/* Quick diagnostic stats & dark mode */}
          <div className="flex items-center gap-3.5">
            {/* Server Online active bubble */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest hidden sm:inline">
                System Active
              </span>
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 md:p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
              title={themeMode === "dark" ? "Set light mode theme" : "Set deep dark theme"}
              aria-label="Toggle App Theme"
            >
              {themeMode === "dark" ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Initials profile square badge */}
            <div 
              className="w-8 h-8 md:w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-extrabold text-xs md:text-sm select-none"
              title="yash2007.31@gmail.com"
            >
              YA
            </div>
          </div>
        </header>

        {/* INNER VIEW CONTENT SCROLLER */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar transition-colors">
          
          {activeTab === "dashboard" && (
            <DashboardCom 
              stats={dashboardStats || fallbackStats} 
              history={history}
              onRefresh={fetchStats} 
              aiInsights={aiInsights}
              generateInsights={generateAiInsights}
              loadingInsights={loadingInsights}
            />
          )}

          {activeTab === "analyzer" && (
            <AnalyzerCom 
              modelStats={modelStats} 
              onAnalyze={handleSingleAnalysis} 
            />
          )}

          {activeTab === "bulk" && (
            <BulkAnalyzerCom 
              onBulkAnalyze={handleBulkAnalysis} 
              onSuccess={() => {
                fetchHistory();
                fetchStats();
              }} 
            />
          )}

          {activeTab === "mllab" && (
            <MlLabCom 
              modelStats={modelStats} 
              loading={loadingMl} 
              onRetrainModel={handleRetrainModel} 
            />
          )}

          {activeTab === "history" && (
            <HistoryListCom 
              history={history}
              onSearchChange={setSearchQuery}
              onSentimentFilterChange={setSentimentFilter}
              onDeleteItem={handleDeleteItem}
              onClearHistory={handleClearHistory}
              searchQuery={searchQuery}
              sentimentFilter={sentimentFilter}
            />
          )}

          {activeTab === "code" && (
            <CodeExporterCom />
          )}

        </div>

        {/* BOTTOM SHOWCASE FOOTER */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 py-3.5 px-6 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-xs text-slate-400 font-sans transition-colors">
          <p className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>Formulated for Data Science Internship Portfolios & LinkedIn Showcases</span>
          </p>
          <p className="font-mono text-[10px] text-slate-500">
            TypeScript • React • scikit-learn • SQLite • Gemini AI
          </p>
        </footer>

      </main>

    </div>
  );
}
