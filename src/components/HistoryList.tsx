/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { HistoryItem } from "../types";
import { 
  Search, 
  Trash2, 
  Download, 
  Trash, 
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Meh
} from "lucide-react";

interface HistoryListProps {
  history: HistoryItem[];
  onSearchChange: (query: string) => void;
  onSentimentFilterChange: (sentiment: string) => void;
  onDeleteItem: (id: string) => Promise<boolean>;
  onClearHistory: () => Promise<boolean>;
  searchQuery: string;
  sentimentFilter: string;
}

export default function HistoryList({
  history,
  onSearchChange,
  onSentimentFilterChange,
  onDeleteItem,
  onClearHistory,
  searchQuery,
  sentimentFilter
}: HistoryListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"date" | "score" | "confidence">("date");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const itemsPerPage = 8;

  // Sorting
  const sortedHistory = [...history].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else if (sortBy === "score") {
      return Math.abs(b.score) - Math.abs(a.score); // largest absolute polarity
    } else {
      return b.confidence - a.confidence; // largest confidence ratios
    }
  });

  // Pagination calculation
  const totalItems = sortedHistory.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedItems = sortedHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    }
  };

  // Compile and dynamic triggers "Export results as CSV"
  const handleExportCSV = () => {
    if (history.length === 0) return;

    // Header strings
    const headers = ["ID", "Text", "Sentiment", "SentimentScore", "Confidence", "Source", "CategoryTag", "Timestamp"];
    
    const rows = history.map(item => {
      // Escape internal quotes inside review texts
      const cleanText = item.text.replace(/"/g, '""');
      return [
        item.id,
        `"${cleanText}"`,
        item.sentiment,
        item.score.toFixed(3),
        item.confidence.toFixed(3),
        `"${item.source}"`,
        `"${item.tag || "General"}"`,
        item.timestamp
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    // Trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sentiment_analysis_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeClearAll = async () => {
    const ok = await onClearHistory();
    if (ok) {
      setShowClearConfirm(false);
      setCurrentPage(1);
    }
  };

  const getSentimentStyle = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/80",
          icon: ThumbsUp
        };
      case "negative":
        return {
          bg: "bg-rose-50 dark:bg-rose-950/20 text-rose-705 dark:text-rose-450 border-rose-200/60 dark:border-rose-800/85",
          icon: ThumbsDown
        };
      default:
        return {
          bg: "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800",
          icon: Meh
        };
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 rounded-2xl shadow-sm p-6 space-y-6" id="history-tab-panel">
      
      {/* FILTER CONTROLLERS ROW */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-805">
        
        {/* Search & filters */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search phrase text input */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search statements list..."
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setCurrentPage(1); // Reset to page 1
              }}
              className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none placeholder-slate-400 hover:border-slate-350 transition text-slate-800 dark:text-slate-150 font-sans"
            />
          </div>

          {/* Sentiment Filter select */}
          <div>
            <select
              value={sentimentFilter}
              onChange={(e) => {
                onSentimentFilterChange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-350 transition font-sans"
            >
              <option value="">All Sentiment Categories</option>
              <option value="positive">Positive Sentiment</option>
              <option value="neutral">Neutral Sentiment</option>
              <option value="negative">Negative Sentiment</option>
            </select>
          </div>

          {/* Sorting orders */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-350 transition font-sans"
            >
              <option value="date">Sort newest first</option>
              <option value="score">Sort biggest polarity (Score)</option>
              <option value="confidence">Sort biggest confidence ratio</option>
            </select>
          </div>
        </div>

        {/* Action triggers */}
        <div className="flex gap-2.5 self-end xl:self-auto shrink-0 font-sans">
          <button
            onClick={handleExportCSV}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-750 bg-white hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-900 dark:hover:bg-slate-850 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            title="Export full logs history locally to Excel/CSV"
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span>Export CSV</span>
          </button>

          {showClearConfirm ? (
            <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 px-2.5 py-1 rounded-xl transition-all">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 px-1 font-mono">Confirm Wipe?</span>
              <button
                onClick={executeClearAll}
                className="bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-rose-500 transition shadow-sm cursor-pointer"
              >
                Yes
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-1.5 py-1 cursor-pointer"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={history.length === 0}
              className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl border border-rose-100 dark:border-rose-950/30 text-rose-600 dark:text-rose-450 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 text-xs font-bold transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear History</span>
            </button>
          )}
        </div>

      </div>

      {/* DATA TABLE GRID */}
      {paginatedItems.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center justify-center border border-dashed rounded-2xl border-slate-200 dark:border-slate-800">
          <Trash className="w-12 h-12 stroke-1 text-slate-300 dark:text-slate-700 animate-pulse mb-3" />
          <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-sans">No logs folder found</h5>
          <p className="text-xs text-slate-400 mt-1 max-w-sm font-sans">
            Cannot find items matching search criteria. Analyze custom comments or load mock dataset logs to pre-populate database lists.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800 uppercase text-[9px] tracking-wider font-mono">
                  <th className="px-5 py-3">Feedback Doc Content</th>
                  <th className="px-5 py-3 shrink-0">Sentiment Class</th>
                  <th className="px-5 py-3 text-right">Score</th>
                  <th className="px-5 py-3 text-right">Confidence</th>
                  <th className="px-5 py-3 max-w-xs text-right">Date / Metadata</th>
                  <th className="px-5 py-3 text-center shrink-0">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-805">
                {paginatedItems.map((item) => {
                  const style = getSentimentStyle(item.sentiment);
                  const Icon = style.icon;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/25 transition-colors">
                      {/* Text content */}
                      <td className="px-5 py-4 max-w-md font-sans text-slate-700 dark:text-slate-300" title={item.text}>
                        <p className="line-clamp-2 leading-relaxed">"{item.text}"</p>
                      </td>

                      {/* Sentiment Class Badge */}
                      <td className="px-5 py-4 font-bold shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize flex items-center gap-1 w-fit ${style.bg}`}>
                          <Icon className="w-3.5 h-3.5" />
                          <span>{item.sentiment}</span>
                        </span>
                      </td>

                      {/* Sentiment Score index */}
                      <td className="px-5 py-4 text-right font-mono font-bold">
                        <span className={item.score >= 0 ? "text-emerald-500" : "text-rose-500"}>
                          {item.score >= 0 ? "+" : ""}{item.score.toFixed(3)}
                        </span>
                      </td>

                      {/* Confidence Percentage */}
                      <td className="px-5 py-4 text-right font-mono text-slate-650 dark:text-slate-450">
                        {(item.confidence * 100).toFixed(0)}%
                      </td>

                      {/* Time / Tags info */}
                      <td className="px-5 py-4 text-right font-sans text-slate-400 space-y-1">
                        <span className="text-[10px] block font-mono">
                          {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex gap-1 justify-end font-mono">
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded text-slate-500">
                            {item.source}
                          </span>
                          <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-400 px-1.5 py-0.5 rounded text-indigo-500">
                            {item.tag || "General"}
                          </span>
                        </div>
                      </td>

                      {/* Delete icon */}
                      <td className="px-5 py-4 text-center shrink-0">
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-500 text-slate-400 rounded-lg transition-colors active:scale-90 cursor-pointer animate-none"
                          title="Delete record irreversibly"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table pagination stats footer */}
          <div className="flex flex-col md:flex-row md:items-center justify-between text-xs text-slate-400 gap-4 mt-2 select-none font-sans">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Showing { (currentPage - 1) * itemsPerPage + 1 } to { Math.min(currentPage * itemsPerPage, totalItems) } of { totalItems } analysis entries</span>
            </span>

            {totalPages > 1 && (
              <div className="flex gap-1.5 justify-end">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-55 dark:hover:bg-slate-850 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePageChange(idx + 1)}
                    className={`px-2.5 py-1 rounded border font-semibold transition cursor-pointer ${
                      currentPage === idx + 1 
                        ? "bg-indigo-650 border-indigo-650 text-white shadow-sm" 
                        : "border-slate-205 hover:bg-slate-55 dark:hover:bg-slate-850 dark:border-slate-800"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-55 dark:hover:bg-slate-850 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
