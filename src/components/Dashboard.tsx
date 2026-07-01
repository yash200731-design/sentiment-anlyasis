/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { SummaryStats, HistoryItem } from "../types";
import SuggestionsPanel from "./SuggestionsPanel";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  AreaChart,
  Area
} from "recharts";
import { 
  PieChart as PieIcon, 
  TrendingUp, 
  Sparkles, 
  ThumbsUp, 
  ThumbsDown, 
  Activity, 
  RefreshCw,
  FolderOpen
} from "lucide-react";

interface DashboardProps {
  stats: SummaryStats;
  history: HistoryItem[];
  onRefresh: () => void;
  aiInsights: string;
  generateInsights: () => void;
  loadingInsights: boolean;
}

export default function Dashboard({
  stats,
  history,
  onRefresh,
  aiInsights,
  generateInsights,
  loadingInsights
}: DashboardProps) {
  // Pie chart data
  const pieData = [
    { name: "Positive", value: stats.positiveCount, color: "#10B981" }, // Emerald 500
    { name: "Neutral", value: stats.neutralCount, color: "#3B82F6" },   // Blue 500
    { name: "Negative", value: stats.negativeCount, color: "#EF4444" }  // Red 500
  ].filter(d => d.value > 0);

  // Fallback if no data
  const chartPlaceholderData = stats.totalAnalyzed === 0 ? [
    { name: "Positive", value: 1, color: "#e5e7eb" },
    { name: "Neutral", value: 1, color: "#e5e7eb" },
    { name: "Negative", value: 1, color: "#e5e7eb" }
  ] : pieData;

  // Compile timeline data from history (grouped by day or just last 10 points)
  const timelineData = history
    .slice()
    .reverse() // oldest to newest
    .slice(-15) // last 15 items
    .map((item, idx) => ({
      index: idx + 1,
      text: item.text.length > 25 ? item.text.substring(0, 25) + "..." : item.text,
      score: Number(item.score.toFixed(2)),
      confidence: Number((item.confidence * 100).toFixed(0)),
      sentiment: item.sentiment
    }));

  // Average sentiment score label helper
  const getScoreDescription = (score: number) => {
    if (score >= 0.35) return { text: "Strongly Positive", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" };
    if (score >= 0.05) return { text: "Mildly Positive", color: "text-teal-500 bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800" };
    if (score > -0.05) return { text: "Balanced Neutral", color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" };
    if (score > -0.35) return { text: "Mildly Negative", color: "text-orange-500 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-850" };
    return { text: "Strongly Negative", color: "text-red-500 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" };
  };

  const scoreDesc = getScoreDescription(stats.averageScore);

  return (
    <div id="dashboard-tab-panel" className="space-y-6">
      {/* Aggregates Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* TOTAL CARDS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-28 hover:shadow transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Analyzed</span>
            <div className="p-2 bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400 rounded-lg group-hover:scale-105 transition-transform">
              <FolderOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
              {stats.totalAnalyzed.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
              <Activity className="w-3 h-3 text-indigo-500 animate-pulse" /> SQLite entries
            </span>
          </div>
        </div>

        {/* POSITIVE COUNTER */}
        <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/70 dark:border-emerald-900/30 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-28 hover:shadow transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-450 uppercase tracking-widest">Positive Feedback</span>
            <div className="p-2 bg-emerald-100/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-105 transition-transform">
              <ThumbsUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight font-sans">
              {stats.positivePercentage}%
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-450 bg-emerald-100/50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
              {stats.positiveCount} items
            </span>
          </div>
        </div>

        {/* NEUTRAL COUNTER */}
        <div className="bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-28 hover:shadow transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Neutral Feedback</span>
            <div className="p-2 bg-slate-200/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg group-hover:scale-105 transition-transform">
              <RefreshCw className="w-4 h-4 rotate-45" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-extrabold text-slate-700 dark:text-slate-300 tracking-tight font-sans">
              {stats.neutralPercentage}%
            </span>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/55 px-2 py-0.5 rounded-full">
              {stats.neutralCount} items
            </span>
          </div>
        </div>

        {/* NEGATIVE COUNTER */}
        <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/70 dark:border-rose-900/30 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-28 hover:shadow transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-450 uppercase tracking-widest">Negative Complaints</span>
            <div className="p-2 bg-rose-100/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg group-hover:scale-105 transition-transform">
              <ThumbsDown className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-extrabold text-rose-700 dark:text-rose-400 tracking-tight font-sans">
              {stats.negativePercentage}%
            </span>
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-450 bg-rose-100/50 dark:bg-rose-950/20 px-2 py-0.5 rounded-full">
              {stats.negativeCount} items
            </span>
          </div>
        </div>

      </div>

      {/* Sentiment Score Gauge & Executive Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sentiment Index Gauge Meter */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold font-sans tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-500" /> Sentiment Score Index
            </h4>
            <p className="text-xs text-slate-400 mt-1">Averaged continuous scale score from -1.0 to 1.0</p>
          </div>

          <div className="my-6">
            <div className="relative h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/40 dark:border-slate-700/40">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 h-full w-0.5 bg-slate-300 dark:bg-slate-650 z-10"></div>
              
              {/* Dynamic bar */}
              <div 
                className={`absolute top-0 h-full transition-all duration-500 ${
                  stats.averageScore >= 0 
                    ? "bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-r-full" 
                    : "bg-gradient-to-l from-indigo-500 to-rose-500 rounded-l-full"
                }`}
                style={{
                  left: stats.averageScore >= 0 ? "50%" : `${50 + stats.averageScore * 50}%`,
                  width: `${Math.abs(stats.averageScore) * 50}%`
                }}
              ></div>
            </div>
            
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-2">
              <span>-1.0 Negative</span>
              <span>0.0 Neutral</span>
              <span>+1.0 Positive</span>
            </div>
          </div>

          <div className="text-center p-3.5 border rounded-xl flex flex-col items-center justify-center transition-colors duration-300 classDescription border-slate-200 dark:border-slate-800 shadow-inner bg-slate-50/50 dark:bg-slate-950/20">
            <span className="text-xs text-slate-400 uppercase font-mono tracking-wider">Average Score</span>
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-800 dark:text-slate-100 my-1">
              {stats.averageScore >= 0 ? "+" : ""}{stats.averageScore.toFixed(3)}
            </span>
            <div className={`mt-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${scoreDesc.color}`}>
              {scoreDesc.text}
            </div>
          </div>
        </div>

        {/* Dynamic Gemini Executive Insights Dashboard */}
        <div className="lg:col-span-2 bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-900 dark:to-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-5 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
            <Sparkles className="w-40 h-40 text-slate-800 dark:text-slate-100" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold font-sans tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-indigo-500 fill-indigo-500/20" /> 
                <span>AI-Generated Executive Summary</span>
              </h4>
              <button 
                onClick={generateInsights}
                disabled={loadingInsights || stats.totalAnalyzed === 0}
                className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingInsights ? 'animate-spin' : ''}`} />
                <span>Re-Analyze</span>
              </button>
            </div>
            
            <div className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 max-h-[190px] overflow-y-auto pr-2 custom-scrollbar">
              {loadingInsights ? (
                <div className="space-y-2.5 py-4">
                  <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded-full w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded-full animate-pulse"></div>
                  <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded-full w-5/6 animate-pulse"></div>
                  <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded-full w-2/3 animate-pulse"></div>
                </div>
              ) : stats.totalAnalyzed === 0 ? (
                <div className="text-center py-6 text-neutral-400 text-sm">
                  Analyze feedback samples first! Once data is registered, click <strong>Re-Analyze</strong> to synthesize a deep strategic briefing through Gemini.
                </div>
              ) : (
                <div className="whitespace-pre-line text-xs md:text-sm text-neutral-700 dark:text-neutral-300 font-sans leading-relaxed">
                  {aiInsights}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-500 fill-purple-400/20" /> Powered by Gemini 3.5 Flash
            </span>
            <span>Real-time semantic telemetry analysis</span>
          </div>
        </div>

      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sentiment Shares Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm">
          <h4 className="text-base font-bold font-sans tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-2">
            <PieIcon className="w-4.5 h-4.5 text-indigo-500" /> Sentiment Distribution
          </h4>
          <p className="text-xs text-slate-400 mb-6 font-sans">Proportional breakdown of categories analyzed in this session</p>
          
          <div className="h-64 flex items-center justify-center">
            {stats.totalAnalyzed === 0 ? (
              <div className="text-slate-300 dark:text-slate-700 text-sm flex flex-col items-center">
                <PieIcon className="w-12 h-12 stroke-1 opacity-20 mb-1" />
                <span>No sentiment records database</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartPlaceholderData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartPlaceholderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: "12px", 
                      fontSize: "12px", 
                      borderColor: "rgba(148, 163, 184, 0.25)",
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      color: "#f8fafc"
                    }} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle" 
                    iconSize={10} 
                    wrapperStyle={{ fontSize: "12px", marginTop: "10px" }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Sentiment Score History Area Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm">
          <h4 className="text-base font-bold font-sans tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-4.5 h-4.5 text-indigo-500" /> Score Pacing Pointers
          </h4>
          <p className="text-xs text-slate-400 mb-6 font-sans">Index pacing of the last 15 reviews analyzed (-1.0 to +1.0)</p>
          
          <div className="h-64">
            {timelineData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 text-sm">
                <TrendingUp className="w-12 h-12 stroke-1 opacity-20 mb-1" />
                <span>No timeline records database</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timelineData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" darkStroke="#334155" opacity={0.3} />
                  <XAxis dataKey="index" tickLine={false} style={{ fontSize: "10px" }} />
                  <YAxis domain={[-1, 1]} tickLine={false} style={{ fontSize: "10px" }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl shadow-lg leading-relaxed max-w-xs text-xs">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">Review Item #{data.index}</p>
                            <p className="text-slate-500 italic mt-0.5 mb-1.5">"{data.text}"</p>
                            <div className="flex justify-between font-mono">
                              <span>Score:</span>
                              <span className={data.score >= 0 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                                {data.score}
                              </span>
                            </div>
                            <div className="flex justify-between font-mono">
                              <span>Confidence:</span>
                              <span className="text-slate-600 dark:text-slate-300">{data.confidence}%</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* AI Actionable strategic operational suggestions panel */}
      <SuggestionsPanel totalAnalyzed={stats.totalAnalyzed} />

    </div>
  );
}
