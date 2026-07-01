/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AISuggestion } from "../types";
import { 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  Tag, 
  TrendingDown, 
  TrendingUp, 
  CheckSquare, 
  AlertCircle,
  Brain,
  Filter,
  Check
} from "lucide-react";

interface SuggestionsPanelProps {
  totalAnalyzed: number;
}

export default function SuggestionsPanel({ totalAnalyzed }: SuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  
  // Expanded card state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Interactive action checklist state: key is `suggestionId-taskIndex`
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("sentix_checked_tasks");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Filters state
  const [impactFilter, setImpactFilter] = useState<"All" | "High" | "Medium" | "Low">("All");
  const [sentimentFilter, setSentimentFilter] = useState<"All" | "Negative" | "Positive">("All");

  const fetchSuggestions = async (forceRefetch = false) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/gemini/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (resp.ok) {
        const data = await resp.json();
        setSuggestions(data.suggestions || []);
        setIsDemo(!!data.isDemo);
        if (data.suggestions && data.suggestions.length > 0 && !expandedId) {
          // Auto-expand first suggestion
          setExpandedId(data.suggestions[0].id);
        }
      } else {
        setError("Failed to generate strategic recommendations. Server returned an error.");
      }
    } catch (e: any) {
      setError("An exception occurred while contacting the Gemini Suggestions API.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch suggestions on load if needed
  useEffect(() => {
    fetchSuggestions();
  }, []);

  // Sync checked tasks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("sentix_checked_tasks", JSON.stringify(checkedTasks));
    } catch (e) {
      console.error(e);
    }
  }, [checkedTasks]);

  const toggleTask = (suggestionId: string, index: number, event: React.MouseEvent) => {
    event.stopPropagation(); // prevent collapsing the card
    const key = `${suggestionId}-${index}`;
    setCheckedTasks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Calculations for interactive metrics
  const totalTasks = suggestions.reduce((acc, sug) => acc + (sug.actionPlan?.length || 0), 0);
  const completedTasks = Object.keys(checkedTasks).filter(key => {
    // only count tasks belonging to current active suggestions list
    const [sugId] = key.split("-");
    return suggestions.some(s => s.id === sugId) && checkedTasks[key];
  }).length;

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filter suggestions
  const filteredSuggestions = suggestions.filter(sug => {
    const matchesImpact = impactFilter === "All" || sug.impact === impactFilter;
    const matchesSentiment = sentimentFilter === "All" || 
      (sentimentFilter === "Negative" && sug.sentimentFocus === "Negative") ||
      (sentimentFilter === "Positive" && sug.sentimentFocus === "Positive");
    return matchesImpact && matchesSentiment;
  });

  // Styles helpers
  const getImpactStyle = (impact: "High" | "Medium" | "Low") => {
    switch (impact) {
      case "High":
        return "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/40";
      case "Medium":
        return "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40";
      case "Low":
        return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40";
      default:
        return "bg-slate-50 dark:bg-slate-800 text-slate-700 border-slate-200";
    }
  };

  const getFocusStyle = (focus: string) => {
    if (focus === "Negative") return "text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/10";
    if (focus === "Positive") return "text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/10";
    return "text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/10";
  };

  return (
    <div id="ai-suggestions-panel" className="space-y-6">
      
      {/* SECTION HEADER CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold font-sans tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-500" />
              <span>AI-Powered Operational Suggestions</span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Gemini synthesizes frequent sentiments and machine learning TF-IDF keywords into specific strategic solutions.
            </p>
          </div>
          
          <button
            onClick={() => fetchSuggestions(true)}
            disabled={loading || totalAnalyzed === 0}
            className="self-start md:self-auto py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${loading ? "animate-spin" : ""}`} />
            <span>Regenerate Suggestions</span>
          </button>
        </div>

        {/* PROGRESS AND DEMO NOTICE */}
        {suggestions.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-150 dark:border-slate-800 flex flex-col md:flex-row gap-5 justify-between items-center">
            
            {/* COMPLETED BAR */}
            <div className="w-full md:max-w-md space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                  <span>Action Plan Tracker</span>
                </span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{completedTasks}/{totalTasks} tasks ({completionPercentage}%)</span>
              </div>
              
              <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* DEMO BADGE KEY INFO */}
            {isDemo && (
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 max-w-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <span>
                  <strong>Demo Mode Enabled:</strong> Displaying pre-trained heuristic models. Configure your <strong>GEMINI_API_KEY</strong> in Settings to unlock real-time custom insights.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FILTER CONTROLS */}
      {suggestions.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between text-xs">
          <div className="flex flex-wrap items-center gap-4">
            
            {/* Impact Filter */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-sans flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Impact Priority:
              </span>
              <div className="flex gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-lg">
                {(["All", "High", "Medium", "Low"] as const).map(imp => (
                  <button
                    key={imp}
                    onClick={() => setImpactFilter(imp)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      impactFilter === imp 
                        ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm" 
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    {imp}
                  </button>
                ))}
              </div>
            </div>

            {/* Sentiment Filter */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-sans flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Sentiment Focus:
              </span>
              <div className="flex gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-lg">
                {(["All", "Positive", "Negative"] as const).map(sent => (
                  <button
                    key={sent}
                    onClick={() => setSentimentFilter(sent)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      sentimentFilter === sent 
                        ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm" 
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    {sent}
                  </button>
                ))}
              </div>
            </div>

          </div>

          <span className="text-[11px] text-slate-400 font-sans">
            Showing {filteredSuggestions.length} of {suggestions.length} suggestions
          </span>
        </div>
      )}

      {/* LIST OF CARDS */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Synthesizing sentiments & TF-IDF keywords via Gemini...</p>
            <p className="text-xs text-slate-400 mt-1">Mining key customer pain points and drafting action steps...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/40 rounded-2xl p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs font-bold text-red-800 dark:text-red-400 block mb-1">Failed to retrieve suggestions</strong>
              <p className="text-xs text-red-600 dark:text-red-500">{error}</p>
              <button 
                onClick={() => fetchSuggestions(true)}
                className="mt-3 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200/80 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-xs font-bold text-red-700 dark:text-red-400 transition"
              >
                Retry Request
              </button>
            </div>
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
            <Sparkles className="w-8 h-8 text-indigo-400 stroke-1 mx-auto mb-3 opacity-40" />
            <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300">No suggestions match filters</h5>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Try resetting your filter constraints or run some initial feedback analysis first to build history.
            </p>
          </div>
        ) : (
          filteredSuggestions.map(sug => {
            const isExpanded = expandedId === sug.id;
            const completedCount = sug.actionPlan?.filter((_, idx) => checkedTasks[`${sug.id}-${idx}`]).length || 0;
            const isFullyCompleted = completedCount === (sug.actionPlan?.length || 0);

            return (
              <div 
                key={sug.id}
                onClick={() => toggleExpand(sug.id)}
                className={`bg-white dark:bg-slate-900 border rounded-2xl transition-all duration-300 shadow-sm cursor-pointer select-none overflow-hidden hover:shadow-md ${
                  isExpanded 
                    ? "border-indigo-400/80 dark:border-indigo-500/50 ring-1 ring-indigo-400/10" 
                    : isFullyCompleted 
                      ? "border-emerald-200 dark:border-emerald-900/30 opacity-80" 
                      : "border-slate-200 dark:border-slate-800"
                }`}
              >
                {/* CARD COLLAPSED HEADER CONTAINER */}
                <div className="p-5 flex items-center justify-between gap-4">
                  
                  <div className="flex items-center gap-3.5 min-w-0">
                    
                    {/* Circle icon with completion status */}
                    <div className="shrink-0">
                      {isFullyCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/20" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] font-mono font-bold text-slate-400">
                          {completedCount}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      
                      {/* CATEGORY & ACCENT PILLS */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-bold">
                          {sug.category}
                        </span>
                        
                        <span className={`px-2 py-0.5 text-[9px] font-bold tracking-wide rounded-md border ${getImpactStyle(sug.impact)}`}>
                          {sug.impact} Impact
                        </span>

                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md flex items-center gap-0.5 ${getFocusStyle(sug.sentimentFocus)}`}>
                          {sug.sentimentFocus === "Negative" ? (
                            <TrendingDown className="w-2.5 h-2.5" />
                          ) : sug.sentimentFocus === "Positive" ? (
                            <TrendingUp className="w-2.5 h-2.5" />
                          ) : (
                            <Brain className="w-2.5 h-2.5" />
                          )}
                          <span>{sug.sentimentFocus} focus</span>
                        </span>
                      </div>

                      {/* MAIN STRATEGIC TITLE */}
                      <h4 className={`text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100 font-sans truncate ${isFullyCompleted ? "line-through text-slate-450 dark:text-slate-500" : ""}`}>
                        {sug.title}
                      </h4>

                    </div>

                  </div>

                  {/* ROTATING EXPAND ARROW */}
                  <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>

                </div>

                {/* CARD EXPANDED DESCRIPTION PANEL */}
                {isExpanded && (
                  <div className="px-5 pb-6 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/10 space-y-5 animate-fade-in">
                    
                    {/* EXPLANATION DETAIL */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono tracking-wider font-extrabold text-slate-400 uppercase">Analysis Trend Context</span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                        {sug.explanation}
                      </p>
                    </div>

                    {/* INTERACTIVE ACTIONS PLAN CHECKLIST */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-mono tracking-wider font-extrabold text-slate-400 uppercase">Interactive Action Plan Checklist</span>
                      
                      <div className="space-y-2">
                        {sug.actionPlan?.map((step, idx) => {
                          const isChecked = !!checkedTasks[`${sug.id}-${idx}`];

                          return (
                            <div 
                              key={idx}
                              onClick={(e) => toggleTask(sug.id, idx, e)}
                              className={`p-3 rounded-xl border flex items-center gap-3 transition cursor-pointer ${
                                isChecked 
                                  ? "bg-emerald-50/30 dark:bg-emerald-950/5 border-emerald-200/50 dark:border-emerald-900/30 text-slate-450 dark:text-slate-500" 
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-950 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              <div className="shrink-0">
                                {isChecked ? (
                                  <div className="w-4.5 h-4.5 rounded bg-emerald-500 text-white flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-4.5 h-4.5 rounded border border-slate-300 dark:border-slate-750 flex items-center justify-center"></div>
                                )}
                              </div>
                              <span className={`text-xs font-medium font-sans ${isChecked ? "line-through text-slate-400" : ""}`}>
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                    </div>

                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
