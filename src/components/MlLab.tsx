/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ModelStats } from "../types";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip
} from "recharts";
import { 
  GraduationCap, 
  Search, 
  Settings, 
  Sliders, 
  Activity, 
  LayoutGrid, 
  TrendingUp, 
  RefreshCw,
  Award,
  BookOpen
} from "lucide-react";

interface MlLabProps {
  modelStats: ModelStats | null;
  loading: boolean;
  onRetrainModel: (dataset?: any, testRatio?: number) => Promise<boolean>;
}

export default function MlLab({ modelStats, loading, onRetrainModel }: MlLabProps) {
  const [searchWord, setSearchWord] = useState("");
  const [testSplit, setTestSplit] = useState(20);
  const [retraining, setRetraining] = useState(false);
  const [trainError, setTrainError] = useState<string | null>(null);

  const handleRetrain = async () => {
    setRetraining(true);
    setTrainError(null);
    try {
      const ok = await onRetrainModel(undefined, testSplit / 100);
      if (!ok) {
         setTrainError("Retraining event returned false. Verify server is online.");
      }
    } catch (err: any) {
      setTrainError(err?.message || "An exception occurred during re-training epochs.");
    } finally {
      setRetraining(false);
    }
  };

  if (!modelStats) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <h5 className="text-base font-bold text-slate-800 dark:text-slate-200 font-sans">Retrieving training parameters...</h5>
        <p className="text-xs text-slate-400 mt-1 font-sans">Interrogating classification vector weights from server.</p>
      </div>
    );
  }

  // Search matching keywords in vocabulary
  const vocabWeightsList: Array<{ word: string, neg: number, neu: number, pos: number }> = [];
  
  if (modelStats.topWordsPerClass) {
    const vocabWords = new Set<string>();
    // Collect unique words
    modelStats.topWordsPerClass.negative?.forEach(w => vocabWords.add(w.word));
    modelStats.topWordsPerClass.neutral?.forEach(w => vocabWords.add(w.word));
    modelStats.topWordsPerClass.positive?.forEach(w => vocabWords.add(w.word));

    vocabWords.forEach(word => {
      const negW = modelStats.topWordsPerClass.negative?.find(w => w.word === word)?.weight || 0;
      const neuW = modelStats.topWordsPerClass.neutral?.find(w => w.word === word)?.weight || 0;
      const posW = modelStats.topWordsPerClass.positive?.find(w => w.word === word)?.weight || 0;
      vocabWeightsList.push({ word, neg: negW, neu: neuW, pos: posW });
    });
  }

  // Filter weights list by keyword query
  const filteredVocabList = vocabWeightsList.filter(item => 
    item.word.toLowerCase().includes(searchWord.toLowerCase().trim())
  ).sort((a, b) => {
    // Sort by largest absolute coefficient
    const maxA = Math.max(Math.abs(a.neg), Math.abs(a.neu), Math.abs(a.pos));
    const maxB = Math.max(Math.abs(b.neg), Math.abs(b.neu), Math.abs(b.pos));
    return maxB - maxA;
  });

  // Confusion matrix layout metrics
  const cm = modelStats.evaluation.confusionMatrix || [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

  return (
    <div className="space-y-6" id="mllab-tab-panel">
      {/* CONTROL UNIT - RETRAIN SETTINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MODEL COMPILER SPEC */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold font-sans text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-505" /> Training Hyper-Params
            </h4>
            <p className="text-xs text-slate-400 mt-1 font-sans">Tune evaluation parameters and re-train the models</p>
          </div>

          <div className="my-5 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1 font-sans">
                <span>Holdout Test Split ratio</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">{testSplit}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                step="5"
                value={testSplit}
                onChange={(e) => setTestSplit(Number(e.target.value))}
                className="w-full h-1 bg-slate-205 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none dark:bg-slate-800"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>10% (High Train)</span>
                <span>40% (Robust Test)</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/85 rounded-xl text-[11px] text-slate-500 font-sans leading-relaxed">
              <strong className="text-slate-700 dark:text-slate-300 block mb-1">Gradient Descent Setup:</strong>
              • TF-IDF Vectorizer smooth log scaling.<br/>
              • Softmax multinomial cost objective.<br/>
              • Regularization: L2 Ridge decay ($\lambda$ = 0.005)<br/>
              • Iterations limit: 120 epochs.
            </div>
          </div>

          <button
            onClick={handleRetrain}
            disabled={retraining || loading}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-indigo-600 hover:bg-slate-800 dark:hover:bg-slate-700 text-white transition active:scale-99 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 cursor-pointer font-sans"
          >
            {retraining ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Gradient Descending...</span>
              </>
            ) : (
              <>
                <GraduationCap className="w-4.5 h-4.5" />
                <span>Train New Model</span>
              </>
            )}
          </button>
        </div>

        {/* CLASSIFICATION SUMMARY REPORT CARD */}
        <div className="lg:col-span-2 bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-900 dark:to-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h4 className="text-base font-bold font-sans text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Award className="w-4.5 h-4.5 text-amber-500" /> Model Performance Report
              </h4>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Out-of-sample valuation computed on the holdout test list split ({testSplit}%)
              </p>
            </div>
            <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-center shadow-md hover:shadow-lg transition-all font-sans">
              <span className="text-[9px] uppercase font-bold text-indigo-200 tracking-wider block font-mono">Accuracy</span>
              <span className="text-xl font-bold font-mono">{(modelStats.accuracy * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Model Metrics Table */}
          <table className="w-full text-left font-sans text-xs my-4 mt-5">
            <thead>
              <tr className="text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="pb-2">Sentiment Class</th>
                <th className="pb-2">Precision</th>
                <th className="pb-2">Recall</th>
                <th className="pb-2">F1-Score</th>
                <th className="pb-2 text-right">Support</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-slate-700 dark:text-slate-300">
              {["negative", "neutral", "positive"].map((className) => {
                const metrics = modelStats.evaluation.metricsPerClass?.[className as any] || { precision: 0, recall: 0, f1Score: 0, support: 0 };
                return (
                  <tr key={className} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                    <td className="py-2.5 font-sans font-bold capitalize text-slate-800 dark:text-slate-100">{className}</td>
                    <td className="py-2.5">{metrics.precision.toFixed(3)}</td>
                    <td className="py-2.5">{metrics.recall.toFixed(3)}</td>
                    <td className="py-2.5 font-bold text-indigo-700 dark:text-indigo-400">{metrics.f1Score.toFixed(3)}</td>
                    <td className="py-2.5 text-right text-slate-400">{metrics.support} samples</td>
                  </tr>
                );
              })}
              {/* Macro average row */}
              <tr className="border-t border-dashed border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100">
                <td className="py-3 font-sans">Macro Average</td>
                <td className="py-3">{modelStats.evaluation.precision.toFixed(3)}</td>
                <td className="py-3">{modelStats.evaluation.recall.toFixed(3)}</td>
                <td className="py-3 text-indigo-600 dark:text-indigo-400">{modelStats.evaluation.f1Score.toFixed(3)}</td>
                <td className="py-3 text-right text-slate-400">-</td>
              </tr>
            </tbody>
          </table>

          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1 font-mono">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Trained over {modelStats.documentCount} document reviews | TF-IDF vocabulary: {modelStats.vocabSize} distinct stems</span>
          </div>
        </div>

      </div>

      {trainError && (
        <div className="bg-rose-50 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-900/45 p-4 rounded-xl text-rose-700 dark:text-rose-455 text-xs font-semibold">
          Error training: {trainError}
        </div>
      )}

      {/* TRAINING HISTORIES PLOTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Learning curves Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm">
          <h4 className="text-base font-bold font-sans text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-4 h-4 text-rose-500" /> Learning Curve: Cost Function
          </h4>
          <p className="text-xs text-slate-400 mb-6 font-sans">Cross-entropy regularized loss plotted over 120 training epochs</p>
          
          <div className="h-60">
            {modelStats.trainingHistory && modelStats.trainingHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={modelStats.trainingHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" darkStroke="#334155" opacity={0.3} />
                  <XAxis dataKey="epoch" tickLine={false} style={{ fontSize: "10px" }} />
                  <YAxis tickLine={false} style={{ fontSize: "10px" }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: "12px", 
                      fontSize: "12px", 
                      borderColor: "rgba(148, 163, 184, 0.25)",
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      color: "#f8fafc"
                    }} 
                  />
                  <Line type="monotone" dataKey="loss" stroke="#f43f5e" strokeWidth={2} dot={false} name="Loss" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-sans">No histories logs available</div>
            )}
          </div>
        </div>

        {/* Accuracy Train Curves */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-sm">
          <h4 className="text-base font-bold font-sans text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-2">
            <Activity className="w-4 h-4 text-emerald-500" /> Training Set Convergence
          </h4>
          <p className="text-xs text-slate-400 mb-6 font-sans">Training batch accuracy alignment converging with gradient descent</p>
          
          <div className="h-60">
            {modelStats.trainingHistory && modelStats.trainingHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={modelStats.trainingHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" darkStroke="#334155" opacity={0.3} />
                  <XAxis dataKey="epoch" tickLine={false} style={{ fontSize: "10px" }} />
                  <YAxis domain={[0.3, 1.0]} tickLine={false} style={{ fontSize: "10px" }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: "12px", 
                      fontSize: "12px", 
                      borderColor: "rgba(148, 163, 184, 0.25)",
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      color: "#f8fafc"
                    }} 
                  />
                  <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} dot={false} name="Train Acc" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-sans">No histories logs available</div>
            )}
          </div>
        </div>

      </div>

      {/* CONFUSION MATRIX & COEFF WEIGHTS SEARCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CONFUSION MATRIX GRID */}
        <div className="lg:col-span-12 xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold font-sans text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-1">
              <LayoutGrid className="w-4 h-4 text-indigo-500" /> Confusion Matrix (Actual vs Pred)
            </h4>
            <p className="text-xs text-slate-400 mb-6 font-sans">Grid representation of true positives (diagonal density)</p>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs my-4 select-none">
            {/* Headers row */}
            <div className="h-10"></div>
            <div className="text-[10px] font-bold uppercase text-slate-400 pt-3">Pred Neg</div>
            <div className="text-[10px] font-bold uppercase text-slate-400 pt-3">Pred Neu</div>
            <div className="text-[10px] font-bold uppercase text-slate-400 pt-3">Pred Pos</div>

            {/* Row Negative */}
            <div className="text-[10px] font-bold uppercase text-slate-400 pt-4 text-left">Act Neg</div>
            {/* Cell Neg-Neg */}
            <div className={`p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 font-bold transition-all ${
              cm[0][0] > 0 ? "bg-rose-500 text-white shadow-sm scale-[1.02]" : "bg-slate-50 dark:bg-slate-950/20 text-slate-400"
            }`} title={`True Negatives: ${cm[0][0]} items`}>
              {cm[0][0]}
            </div>
            {/* Cell Neg-Neu */}
            <div className={`p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 font-medium ${
              cm[0][1] > 0 ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" : "bg-slate-50 dark:bg-slate-950/20 text-slate-300 dark:text-slate-805"
            }`} title={`Actual Neg, Pred Neu: ${cm[0][1]} items`}>
              {cm[0][1]}
            </div>
            {/* Cell Neg-Pos */}
            <div className={`p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 font-medium ${
              cm[0][2] > 0 ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" : "bg-slate-50 dark:bg-slate-950/20 text-slate-300 dark:text-slate-805"
            }`} title={`Actual Neg, Pred Pos: ${cm[0][2]} items`}>
              {cm[0][2]}
            </div>

            {/* Row Neutral */}
            <div className="text-[10px] font-bold uppercase text-slate-400 pt-4 text-left">Act Neu</div>
            {/* Cell Neu-Neg */}
            <div className={`p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 font-medium ${
              cm[1][0] > 0 ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" : "bg-slate-50 dark:bg-slate-950/20 text-slate-300 dark:text-slate-805"
            }`} title={`Actual Neu, Pred Neg: ${cm[1][0]} items`}>
              {cm[1][0]}
            </div>
            {/* Cell Neu-Neu */}
            <div className={`p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 font-bold transition-all ${
              cm[1][1] > 0 ? "bg-indigo-500 text-white shadow-sm scale-[1.02]" : "bg-slate-50 dark:bg-slate-950/20 text-slate-400"
            }`} title={`True Neutrals: ${cm[1][1]} items`}>
              {cm[1][1]}
            </div>
            {/* Cell Neu-Pos */}
            <div className={`p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 font-medium ${
              cm[1][2] > 0 ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" : "bg-slate-50 dark:bg-slate-950/20 text-slate-300 dark:text-slate-805"
            }`} title={`Actual Neu, Pred Pos: ${cm[1][2]} items`}>
              {cm[1][2]}
            </div>

            {/* Row Positive */}
            <div className="text-[10px] font-bold uppercase text-slate-400 pt-4 text-left">Act Pos</div>
            {/* Cell Pos-Neg */}
            <div className={`p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 font-medium ${
              cm[2][0] > 0 ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" : "bg-slate-50 dark:bg-slate-950/20 text-slate-300 dark:text-slate-805"
            }`} title={`Actual Pos, Pred Neg: ${cm[2][0]} items`}>
              {cm[2][0]}
            </div>
            {/* Cell Pos-Neu */}
            <div className={`p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 font-medium ${
              cm[2][1] > 0 ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" : "bg-slate-50 dark:bg-slate-950/20 text-slate-300 dark:text-slate-805"
            }`} title={`Actual Pos, Pred Neu: ${cm[2][1]} items`}>
              {cm[2][1]}
            </div>
            {/* Cell Pos-Pos */}
            <div className={`p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 font-bold transition-all ${
              cm[2][2] > 0 ? "bg-emerald-500 text-white shadow-sm scale-[1.02]" : "bg-slate-50 dark:bg-slate-950/20 text-slate-400"
            }`} title={`True Positives: ${cm[2][2]} items`}>
              {cm[2][2]}
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-center italic mt-2 font-sans leading-relaxed">
            Highlighted blocks indicate diagonal agreement on out-of-split metrics.
          </p>
        </div>

        {/* COEFF WEIGHT KEYWORD EXAMINER */}
        <div className="lg:col-span-12 xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold font-sans text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-1">
              <Search className="w-4 h-4 text-indigo-500" /> Active Vocabulary Coefficients Examiner
            </h4>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Search stem words in model coefficients to list their specific multinomial relative logit weights.
            </p>
          </div>

          <div className="relative mb-3">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search stemming keywords (e.g., 'charg', 'bad', 'enjoy', 'support')..."
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-550 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none placeholder-slate-400 hover:border-slate-350 transition text-slate-800 dark:text-slate-150 font-sans"
            />
          </div>

          <div className="max-h-56 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl custom-scrollbar mt-1">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-400 font-bold font-mono text-[10px] uppercase sticky top-0 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-2">Stem Keyword</th>
                  <th className="px-3 py-2 text-right">β_Negative</th>
                  <th className="px-3 py-2 text-right">β_Neutral</th>
                  <th className="px-3 py-2 text-right">β_Positive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                {filteredVocabList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-400 font-sans italic">
                      No matching keywords found in model weights database. Try another search.
                    </td>
                  </tr>
                ) : (
                  filteredVocabList.slice(0, 30).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-colors">
                      <td className="px-3 py-2 font-sans font-bold text-slate-700 dark:text-slate-300">
                        "{row.word}"
                      </td>
                      <td className={`px-3 py-2 text-right ${row.neg > 0.05 ? "text-rose-500 font-bold" : "text-slate-500"}`}>
                        {row.neg >= 0 ? "+" : ""}{row.neg.toFixed(3)}
                      </td>
                      <td className={`px-3 py-2 text-right ${row.neu > 0.05 ? "text-indigo-500 font-bold" : "text-slate-500"}`}>
                        {row.neu >= 0 ? "+" : ""}{row.neu.toFixed(3)}
                      </td>
                      <td className={`px-3 py-2 text-right ${row.pos > 0.05 ? "text-emerald-500 font-bold" : "text-slate-500"}`}>
                        {row.pos >= 0 ? "+" : ""}{row.pos.toFixed(3)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400 italic mt-3 font-sans leading-relaxed text-left">
            Showing top {Math.min(30, filteredVocabList.length)} vocabulary items sorted by coefficient magnitudes. Large values shift Softmax probability weights heavily.
          </p>
        </div>

      </div>

    </div>
  );
}
