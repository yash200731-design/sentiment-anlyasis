/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AnalysisResponse, ModelStats } from "../types";
import { 
  Sparkles, 
  Send, 
  RefreshCw, 
  HelpCircle, 
  CheckCircle,
  AlertTriangle,
  Info,
  Layers,
  FileText,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Meh
} from "lucide-react";

interface AnalyzerProps {
  modelStats: ModelStats | null;
  onAnalyze: (
    text: string, 
    generateSuggestions: boolean, 
    source: string, 
    tag: string
  ) => Promise<AnalysisResponse | null>;
}

export default function Analyzer({ modelStats, onAnalyze }: AnalyzerProps) {
  const [text, setText] = useState("");
  const [generateSuggestions, setGenerateSuggestions] = useState(true);
  const [source, setSource] = useState("Single Text");
  const [tag, setTag] = useState("General");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Common quick prompt suggestions
  const SAMPLE_PROMPTS = [
    { text: "Love this interface, it's so quick and easily configurable!", label: "Positive", tag: "Feedback" },
    { text: "Worst product ever. Arrived broken, and customer support was extremely lazy.", label: "Negative", tag: "Tech Review" },
    { text: "I ordered a classic double cheeseburger. It tasted normal. Standard portion size.", label: "Neutral", tag: "Food Review" }
  ];

  const handleQuickSelect = (sample: typeof SAMPLE_PROMPTS[0]) => {
    setText(sample.text);
    setTag(sample.tag);
  };

  const executeAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const resp = await onAnalyze(text, generateSuggestions, source, tag);
      if (resp) {
        setResult(resp);
      } else {
        setError("Analysis failed. Please verify that the backend is responsive.");
      }
    } catch (err: any) {
      setError(err?.message || "An exception occurred during sentiment assessment.");
    } finally {
      setLoading(false);
    }
  };

  const copySuggestions = () => {
    if (!result?.aiSuggestions) return;
    navigator.clipboard.writeText(result.aiSuggestions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Preprocessing Word highlighting logic
  const renderWordHighlighter = () => {
    if (!result || !modelStats) return null;

    const tokens = result.analysis.preprocessingLog.tokens;
    const steamedList = result.analysis.preprocessingLog.stemmed;
    // Map stemmed words to original matching tokens for highlights
    const stemmedSet = new Set(steamedList);

    // Get top vocab index to evaluate regression weights
    const vocab = modelStats.topWordsPerClass;

    // Tokenize full text into array of strings including spaces & punctuation to preserve readability
    // Regex splits on word boundaries
    const wordsAndSpaces = result.analysis.preprocessingLog.original.split(/(\s+)/);

    return (
      <div className="flex flex-wrap items-center gap-1 leading-relaxed bg-neutral-50 dark:bg-neutral-950/40 p-4 border rounded-xl font-sans mt-3">
        {wordsAndSpaces.map((chunk, idx) => {
          const cleanWord = chunk.toLowerCase().replace(/[^a-z0-9']/gi, "");
          const cleanStemmed = cleanWord ? cleanWord.toLowerCase().trim() : "";
          
          // Let's stemming
          // Simple local check: does our stems list contain this word?
          const isStopWord = cleanWord && !stemmedSet.has(cleanStemmed) && cleanWord.length > 0;
          const isVocabularyWord = cleanStemmed && stemmedSet.has(cleanStemmed);

          if (!isVocabularyWord) {
            return (
              <span 
                key={idx} 
                className={`${isStopWord ? "text-neutral-400 dark:text-neutral-600 line-through decoration-neutral-300 font-sans" : "text-neutral-800 dark:text-neutral-300 font-sans"}`}
                title={isStopWord ? "Filtered out Stopword" : undefined}
              >
                {chunk}
              </span>
            );
          }

          // It is a vocabulary word. Find out weight coefficient
          // In multiclass Softmax regression, we have three weights for each word.
          // Let's fetch weights from modelStats topWords list to estimate sentiment impact!
          let sentimentLabel = "Neutral";
          let sentimentColor = "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300";
          let weightVal = 0;

          // Find this word weights inside topWordsPerClass
          const pathPos = vocab.positive?.find(w => w.word === cleanStemmed);
          const pathNeg = vocab.negative?.find(w => w.word === cleanStemmed);
          const pathNeu = vocab.neutral?.find(w => w.word === cleanStemmed);

          if (pathPos && (!pathNeg || pathPos.weight > pathNeg.weight)) {
            sentimentLabel = "Positive";
            weightVal = pathPos.weight;
            sentimentColor = "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900";
          } else if (pathNeg && (!pathPos || pathNeg.weight > pathPos.weight)) {
            sentimentLabel = "Negative";
            weightVal = pathNeg.weight;
            sentimentColor = "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900";
          } else if (pathNeu) {
            sentimentLabel = "Neutral";
            weightVal = pathNeu.weight;
            sentimentColor = "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900";
          } else {
            // General word
            sentimentColor = "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700";
          }

          return (
            <span
              key={idx}
              className={`px-1.5 py-0.5 rounded border text-xs font-medium cursor-help transition-all shadow-sm ${sentimentColor}`}
              title={`Stemmed form: "${cleanStemmed}" | Sentiment classification: ${sentimentLabel} | Coefficient influence: ${weightVal > 0 ? "+" : ""}${weightVal.toFixed(2)}`}
            >
              {chunk}
            </span>
          );
        })}
      </div>
    );
  };

  // Visual Theme mapping based on sentiment result
  const getThemeBySentiment = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return {
          bg: "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/60",
          accent: "text-emerald-500",
          icon: ThumbsUp,
          textColor: "text-emerald-800 dark:text-emerald-400",
          darkBg: "bg-emerald-500",
          badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
        };
      case "negative":
        return {
          bg: "bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/60",
          accent: "text-red-500",
          icon: ThumbsDown,
          textColor: "text-red-800 dark:text-red-400",
          darkBg: "bg-red-500",
          badgeColor: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
        };
      default:
        return {
          bg: "bg-blue-50/50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/60",
          accent: "text-blue-500",
          icon: Meh,
          textColor: "text-blue-800 dark:text-blue-400",
          darkBg: "bg-blue-500",
          badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
        };
    }
  };

  const activeTheme = result ? getThemeBySentiment(result.analysis.sentiment) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="analyzer-tab-panel">
      {/* INPUT FORM BLOCK */}
      <div className="lg:col-span-12 xl:col-span-5 space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-6 shadow-sm">
          <h4 className="text-base font-bold font-sans text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-1">
            <FileText className="w-4 h-4 text-indigo-500" /> Sentiment Predictor
          </h4>
          <p className="text-xs text-slate-450 mb-5">Predict sentiments with real-time word weightings</p>

          <form onSubmit={executeAnalysis} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Enter Text Feedback
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type customer reviews, tweets, email feedback, product compliments, or complaints..."
                className="w-full h-44 px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-100 resize-none font-sans"
                maxLength={400}
                required
              />
              <div className="text-right text-[11px] font-mono text-slate-400 mt-1">
                {text.length}/400 characters max
              </div>
            </div>

            {/* Parameters Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Source Channel
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full text-xs px-2.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-705 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Single Text">Single Text</option>
                  <option value="Tweet Channel">Tweet</option>
                  <option value="Reddit Thread">Reddit</option>
                  <option value="App Store Response">App Store</option>
                  <option value="Contact Form Email">Contact Email</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Tag Category
                </label>
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full text-xs px-2.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-705 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="General">General</option>
                  <option value="Tech Review">Tech Review</option>
                  <option value="Food Review">Food Review</option>
                  <option value="Hotel Review">Hotel Review</option>
                  <option value="Customer Support">Support</option>
                  <option value="Marketing Tweet">Tweet</option>
                </select>
              </div>
            </div>

            {/* AI suggestions Toggle */}
            <div className="flex items-center justify-between p-3.5 border border-dashed rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <div>
                  <h5 className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                    Gemini AI Suggestions
                  </h5>
                  <p className="text-[10px] text-slate-400">Generate 3 takeaways based on sentiment</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateSuggestions}
                  onChange={(e) => setGenerateSuggestions(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:bg-slate-700 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Analyze Submit Button */}
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-750 text-white transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-99 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-650/15"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Preprocessing text corpus...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Analyze Sentiment</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Quick presets help text */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/80 rounded-2xl p-5 shadow-sm">
          <h5 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-neutral-400" /> Quick Sandbox Presets
          </h5>
          <div className="space-y-2">
            {SAMPLE_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickSelect(sample)}
                className="w-full text-left p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/50 hover:border-neutral-200 dark:hover:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-400 flex items-center justify-between gap-3 font-sans hover:bg-neutral-50 dark:hover:bg-neutral-950/40"
              >
                <span className="truncate">"{sample.text}"</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                  sample.label === "Positive" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20" :
                  sample.label === "Negative" ? "bg-red-50 text-red-700 dark:bg-red-950/20" :
                  "bg-blue-50 text-blue-700 dark:bg-blue-950/20"
                }`}>
                  {sample.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ANALYSIS RESULTS BLOCK */}
      <div className="lg:col-span-7 space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/15 border border-red-100 dark:border-red-900/40 text-red-800 dark:text-red-400 rounded-2xl p-5 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold">Execution Error</h5>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/80 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[440px]">
            <HelpCircle className="w-16 h-16 stroke-1 text-neutral-300 dark:text-neutral-700 animate-pulse mb-3" />
            <h5 className="text-base font-bold text-neutral-800 dark:text-neutral-200">Awaiting user input feedback</h5>
            <p className="text-xs text-neutral-400 max-w-sm mt-1.5 mx-auto">
              Submit custom text sentences on the left. The TF-IDF vectorizer + Softmax Logistic Regression training pipeline computes the output, confidence ratios, and details!
            </p>
          </div>
        )}

        {loading && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/80 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[440px]">
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <h5 className="text-base font-bold text-neutral-800 dark:text-neutral-200">Running sentiment classifier</h5>
            <div className="text-xs text-neutral-400 space-y-1 mt-2 font-mono">
              <p>1. Lowercasing and striping punctuation...</p>
              <p>2. Matching with 140+ stop words...</p>
              <p>3. Stemming word stems and calculating TF-IDF vector...</p>
              <p>4. Running logistic weights multinomial classification...</p>
            </div>
          </div>
        )}

        {result && activeTheme && (
          <div className="space-y-6">
            
            {/* Classification results card */}
            <div className={`p-6 border rounded-2xl shadow-sm transition-all duration-300 ${activeTheme.bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-400 capitalize bg-white dark:bg-neutral-900 px-2 rounded-full font-semibold border-neutral-100 shadow-sm border py-0.5">
                    {result.analysis.sentiment} sentiment
                  </span>
                  <h3 className={`text-4xl font-extrabold font-sans leading-none mt-2 flex items-center gap-2 ${activeTheme.textColor}`}>
                    <activeTheme.icon className="w-9 h-9" />
                    <span>{result.analysis.sentiment.toUpperCase()}</span>
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 block uppercase">confidence</span>
                  <span className="text-3xl font-bold font-mono tracking-tight text-neutral-800 dark:text-neutral-100">
                    {(result.analysis.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Classification probability meters */}
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-xs text-neutral-500 font-medium">
                  <span>Class Probabilities</span>
                  <span className="text-[10px] text-neutral-400 font-mono">Softmax Probability density</span>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {/* Negative probability */}
                  <div className="bg-white/95 dark:bg-neutral-900 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-400 font-semibold block uppercase">Negative</span>
                    <span className="text-sm font-bold font-mono text-red-500">
                      {(result.analysis.probabilities.negative * 100).toFixed(0)}%
                    </span>
                    <div className="h-1 bg-neutral-100 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${result.analysis.probabilities.negative * 100}%` }}></div>
                    </div>
                  </div>

                  {/* Neutral probability */}
                  <div className="bg-white/95 dark:bg-neutral-900 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-400 font-semibold block uppercase">Neutral</span>
                    <span className="text-sm font-bold font-mono text-blue-500">
                      {(result.analysis.probabilities.neutral * 100).toFixed(0)}%
                    </span>
                    <div className="h-1 bg-neutral-100 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${result.analysis.probabilities.neutral * 100}%` }}></div>
                    </div>
                  </div>

                  {/* Positive probability */}
                  <div className="bg-white/95 dark:bg-neutral-900 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-400 font-semibold block uppercase">Positive</span>
                    <span className="text-sm font-bold font-mono text-emerald-500">
                      {(result.analysis.probabilities.positive * 100).toFixed(0)}%
                    </span>
                    <div className="h-1 bg-neutral-100 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${result.analysis.probabilities.positive * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Word Weight Highlighter explorer */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/80 rounded-2xl p-6 shadow-sm">
              <h4 className="text-sm font-bold font-sans text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-neutral-500" /> Active Regression Words Map
              </h4>
              <p className="text-xs text-neutral-400 mt-1">
                Words highlighted resolved inside TF-IDF. Hover over keyword badges to inspect their class bias and mathematical multiplier factor coefficient.
              </p>
              
              {renderWordHighlighter()}
            </div>

            {/* Preprocessing Step Pipeline */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/80 rounded-2xl p-6 shadow-sm">
              <h4 className="text-sm font-bold font-sans text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Preprocessing Log Execution
              </h4>
              <p className="text-xs text-neutral-400 mt-1">
                How our algorithm parsed and cleaned the string before executing model evaluations
              </p>

              <div className="mt-5 space-y-4">
                {/* Timeline visual */}
                <div className="relative pl-6 border-l border-neutral-200 dark:border-neutral-800 ml-2 py-1 space-y-4 text-xs font-mono">
                  {/* Step 1 */}
                  <div className="relative">
                    <span className="absolute -left-8.5 top-0.5 bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                    <div className="flex flex-col">
                      <span className="text-neutral-400 text-[10px] uppercase font-semibold">Lowercased String</span>
                      <span className="text-neutral-700 dark:text-neutral-300 italic mt-0.5">
                        "{result.analysis.preprocessingLog.lowercased}"
                      </span>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative">
                    <span className="absolute -left-8.5 top-0.5 bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                    <div>
                      <span className="text-neutral-400 text-[10px] uppercase font-semibold">Tokenized Corpus</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.analysis.preprocessingLog.tokens.length === 0 ? (
                          <span className="text-neutral-400 italic">None</span>
                        ) : (
                          result.analysis.preprocessingLog.tokens.map((tok, index) => (
                            <span key={index} className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-[10px]">
                              "{tok}"
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative">
                    <span className="absolute -left-8.5 top-0.5 bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                    <div>
                      <span className="text-neutral-400 text-[10px] uppercase font-semibold">Stopwords Removed</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.analysis.preprocessingLog.noStopwords.length === 0 ? (
                          <span className="text-neutral-400 italic">No remaining words</span>
                        ) : (
                          result.analysis.preprocessingLog.noStopwords.map((tok, index) => (
                            <span key={index} className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-500 px-1.5 py-0.5 rounded text-[10px]">
                              "{tok}"
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="relative">
                    <span className="absolute -left-8.5 top-0.5 bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">4</span>
                    <div>
                      <span className="text-emerald-500 text-[10px] uppercase font-bold tracking-wide">Stemmed Base Forms (ML Input)</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.analysis.preprocessingLog.stemmed.length === 0 ? (
                          <span className="text-neutral-400 italic">No stemmed tokens. Zero vector.</span>
                        ) : (
                          result.analysis.preprocessingLog.stemmed.map((tok, index) => (
                            <span key={index} className="bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              "{tok}"
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* AI Generated Suggestions Based on Text */}
            {generateSuggestions && result.aiSuggestions && (
              <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 dark:from-neutral-950 dark:to-neutral-900 border border-neutral-800 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Sparkles className="w-32 h-32" />
                </div>
                
                <div className="flex items-center justify-between border-b border-neutral-700/50 pb-3 mb-4">
                  <h5 className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400/20 animate-pulse" />
                    <span>Gemini Dynamic Recommendations</span>
                  </h5>
                  <button
                    onClick={copySuggestions}
                    className="p-1 px-2.5 rounded-lg border border-neutral-700 hover:bg-neutral-700 transition flex items-center gap-1.5 text-[11px] font-semibold active:scale-95"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>

                <div className="text-xs md:text-sm text-neutral-300 font-sans tracking-wide leading-relaxed space-y-1.5 ml-1">
                  {result.aiSuggestions.split("\n").map((line, idx) => {
                    const cleanLine = line.trim();
                    if (!cleanLine) return null;
                    return (
                      <p key={idx} className="flex items-start gap-2.5 py-0.5">
                        <span className="text-blue-400 font-bold mt-0.5">•</span>
                        <span>{cleanLine.replace(/^[-*•]?\s*/, "")}</span>
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
