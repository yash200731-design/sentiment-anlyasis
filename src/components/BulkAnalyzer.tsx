/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { HistoryItem } from "../types";
import { 
  UploadCloud, 
  HelpCircle, 
  CheckCircle,
  FileSpreadsheet,
  Trash2,
  Play,
  Settings,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

interface BulkAnalyzerProps {
  onBulkAnalyze: (items: Array<{ text: string, source: string, tag: string }>) => Promise<HistoryItem[] | null>;
  onSuccess: () => void;
}

export default function BulkAnalyzer({ onBulkAnalyze, onSuccess }: BulkAnalyzerProps) {
  const [csvText, setCsvText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default sample review CSV
  const SAMPLE_CSV = `ReviewText,Source,Category
"This is the most incredible, stunning phone screen ever! Extremely satisfied.","App Store","Tech Review"
"Worst customer service. Support tickets took 5 days and they refused a return.","Contact Email","Customer Support"
"We checked into the hotel. The room was standard size and clean. Very ordinary.","Web Form","Hotel Review"
"Avoid this place. The soup was cold and greasy, and the chef was really rude.","Yelp","Food Review"
"Fast delivery, robust casing, and exceptionally high-grade battery. Outstanding!","Amazon","Tech Review"
"The movie was basic. Simple standard acting, pacing felt extremely average.","Twitter","General"`;

  const loadSampleCsv = () => {
    setCsvText(SAMPLE_CSV);
    setError(null);
  };

  // Drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      if (!dragActive) {
        setDragActive(true);
      }
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCsvFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      handleCsvFile(e.target.files[0]);
    }
  };

  const handleCsvFile = (file: File) => {
    // Check type
    if (file.name.slice(-4).toLowerCase() !== ".csv" && file.type !== "text/csv") {
      setError("Invalid file type. Please upload a structured .CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setCsvText(text);
      }
    };
    reader.onerror = () => {
      setError("Failed to read CSV file content.");
    };
    reader.readAsText(file);
  };

  // Basic robust CSV parser (handling quoted fields)
  const parseCsvData = (rawText: string): Array<{ text: string, source: string, tag: string }> => {
    const lines = rawText.split(/\r?\n/);
    const parsed: Array<{ text: string, source: string, tag: string }> = [];

    if (lines.length <= 1) return [];

    // Simple regex to parse CSV line handling quotes
    const csvLineRegex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;

    const parseLine = (line: string): string[] => {
      const row: string[] = [];
      let currentVal = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(currentVal.trim().replace(/^"|"$/g, ""));
          currentVal = "";
        } else {
          currentVal += char;
        }
      }
      row.push(currentVal.trim().replace(/^"|"$/g, ""));
      return row;
    };

    // Find custom indexes or fallback to positional (Text: col 0, Source: col 1, Tag: col 2)
    const headerLine = lines[0];
    const headers = parseLine(headerLine).map(h => h.toLowerCase().trim());
    
    let textIdx = 0;
    let sourceIdx = 1;
    let tagIdx = 2;

    headers.forEach((h, idx) => {
      if (h.includes("review") || h.includes("text") || h.includes("content") || h.includes("body")) {
        textIdx = idx;
      } else if (h.includes("source") || h.includes("channel")) {
        sourceIdx = idx;
      } else if (h.includes("category") || h.includes("tag") || h.includes("label")) {
        tagIdx = idx;
      }
    });

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells = parseLine(line);
      const textVal = cells[textIdx] || "";
      if (textVal.length < 3) continue; // skip noise

      parsed.push({
        text: textVal,
        source: cells[sourceIdx] || "CSV Import",
        tag: cells[tagIdx] || "Bulk Log"
      });
    }

    return parsed;
  };

  const processBulkAnalysis = async () => {
    if (!csvText.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const parsedData = parseCsvData(csvText);
      
      if (parsedData.length === 0) {
        setError("Could not parse any valid feedback rows in this CSV. Please check formatting. The first row must be a heading like ReviewText,Source,Category.");
        setLoading(false);
        return;
      }

      const outcome = await onBulkAnalyze(parsedData);
      if (outcome && outcome.length > 0) {
        setResults(outcome);
        setCsvText(""); // Wipe field
        onSuccess(); // Trigger layout stat reload
      } else {
        setError("Error: Backend database failed to compile or persist bulk reviews.");
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred during bulk evaluation operations.");
    } finally {
      setLoading(false);
    }
  };

  // Compile dashboard aggregates of this uploaded batch
  const getBatchAggregates = () => {
    if (!results) return null;
    let pos = 0, neg = 0, neu = 0;
    results.forEach(item => {
      if (item.sentiment === "positive") pos++;
      else if (item.sentiment === "negative") neg++;
      else if (item.sentiment === "neutral") neu++;
    });

    return { pos, neg, neu, total: results.length };
  };

  const batchStats = getBatchAggregates();

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="bulk-analyzer-tab-panel">
        
        {/* CSV Drop zone config */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-6 shadow-sm">
            <h4 className="text-base font-bold font-sans text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-1">
              <UploadCloud className="w-4.5 h-4.5 text-indigo-500" /> Multiple Reviews CSV Upload
            </h4>
            <p className="text-xs text-slate-400 mb-5 font-sans">
              Streamline multiple customer feedback statements at once! Drop a CSV directly.
            </p>
  
            {/* Drag and drop panel */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer group flex flex-col items-center justify-center p-8 aspect-[4/3] rounded-2xl border-2 border-dashed text-center transition-all ${
                dragActive 
                  ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20" 
                  : "border-slate-250 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/20"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".csv"
                className="hidden"
              />
              
              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center transition-transform group-hover:scale-105 pointer-events-none">
                <FileSpreadsheet className="w-7 h-7 text-indigo-500" />
              </div>
  
              <h5 className="text-[13px] font-bold text-slate-700 dark:text-slate-300 mt-4 font-sans pointer-events-none">
                Drag & Drop Feedback CSV here
              </h5>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs font-sans pointer-events-none">
                Accepts standard compiled CSV files. Columns should ideally contain <strong>ReviewText</strong>, <strong>Source</strong>, <strong>Category</strong>. Or click to select from file browser.
              </p>
            </div>
  
            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="flex-shrink mx-4 text-[10px] uppercase font-bold text-slate-400 font-mono">Or paste raw csv text</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>
  
            {/* Raw copy paste textbox */}
            <div className="space-y-3">
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder='ReviewText,Source,Category&#10;"The packaging broke on transit. Terrible.","Amazon","Tech Review"&#10;"I love using this applet interface! Awesome.","App Store","Feedback"'
                className="w-full h-36 px-3 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-100 resize-none custom-scrollbar"
              />
  
              <div className="flex gap-2 font-sans">
                <button
                  type="button"
                  onClick={loadSampleCsv}
                  className="flex-1 py-2 px-3 border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-950/40 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 transition cursor-pointer"
                >
                  Load Sample Template
                </button>
                
                <button
                  type="button"
                  onClick={() => setCsvText("")}
                  className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/40 rounded-lg text-slate-400 hover:text-rose-500 transition cursor-pointer animate-none"
                  title="Clear contents"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
  
            {/* Trigger button */}
            <button
              onClick={processBulkAnalysis}
              disabled={loading || !csvText.trim()}
              className="w-full mt-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-indigo-600 hover:bg-indigo-750 text-white transition-all cursor-pointer active:scale-99 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 font-sans"
            >
              {loading ? (
                <>
                  <Settings className="w-4 h-4 animate-spin" />
                  <span>Processing multi-token TF-IDF values...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Execute bulk sentiment analyses</span>
                </>
              )}
            </button>
          </div>
        </div>
  
        {/* RESULTS BATCH DATA TABLE */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-6">
          
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-900/40 text-rose-800 dark:text-rose-455 rounded-2xl p-5 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h5 className="font-bold">Parsing Exception</h5>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

        {!results && !loading && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[440px]">
            <FileSpreadsheet className="w-16 h-16 stroke-1 text-slate-300 dark:text-slate-700 mb-3" />
            <h5 className="text-base font-bold text-slate-800 dark:text-slate-200 font-sans">Awaiting multi-records upload</h5>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mx-auto font-sans">
              Drop a `.CSV` file or load the sample mock review template with 6 diversified statements. Click <strong>Execute</strong> to analyze the batch of rows together on the server.
            </p>
          </div>
        )}

        {loading && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[440px]">
            <Settings className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <h5 className="text-base font-bold text-slate-800 dark:text-slate-200 font-sans">Batch classifier running</h5>
            <p className="text-xs text-slate-400 mt-1 max-w-xs font-sans">
              Running vectorized evaluations over rows, assigning predictions, and matching database indexes. Please wait...
            </p>
          </div>
        )}

        {results && batchStats && (
          <div className="space-y-6">
            
            {/* Batch stats summaries */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/95 rounded-2xl p-5 shadow-sm">
              <h4 className="text-sm font-bold font-sans text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-4">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Upload Batch Insights
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/40 p-3.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase font-mono">Parsed Rows</span>
                  <span className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 block">
                    {batchStats.total}
                  </span>
                </div>

                <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/30 p-3.5 rounded-xl">
                  <span className="text-[10px] text-emerald-600 font-bold block uppercase font-mono">Positive</span>
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-500 mt-1 block">
                    {batchStats.pos}
                  </span>
                </div>

                <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/30 p-3.5 rounded-xl">
                  <span className="text-[10px] text-indigo-600 block uppercase font-bold font-mono">Neutral</span>
                  <span className="text-xl font-bold font-mono text-indigo-600 mt-1 block dark:text-indigo-400">
                    {batchStats.neu}
                  </span>
                </div>

                <div className="bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100/30 p-3.5 rounded-xl">
                  <span className="text-[10px] text-rose-600 block uppercase font-bold font-mono">Negative</span>
                  <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-455 mt-1 block">
                    {batchStats.neg}
                  </span>
                </div>
              </div>
            </div>

            {/* Batch Table list */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase font-mono">
                  Batch classification outputs list
                </h4>
                <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Successfully persisted in database history</span>
                </div>
              </div>
              
              <div className="max-h-[340px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-[10px] uppercase font-bold">
                      <th className="px-4 py-3 max-w-xs">Feedback doc</th>
                      <th className="px-4 py-3 shrink-0">Sentiment</th>
                      <th className="px-4 py-3 text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-805">
                    {results.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-colors">
                        <td className="px-4 py-3.5 max-w-sm truncate text-slate-700 dark:text-slate-300 font-sans" title={item.text}>
                          {item.text}
                        </td>
                        <td className="px-4 py-3.5 capitalize shrink-0 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.sentiment === "positive" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" :
                            item.sentiment === "negative" ? "bg-rose-50 text-rose-700 dark:bg-rose-955/20 dark:text-rose-400" :
                            "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400"
                          }`}>
                            {item.sentiment}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-500 dark:text-slate-400">
                          {(item.confidence * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
