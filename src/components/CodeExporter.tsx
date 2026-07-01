/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Terminal, 
  Code2, 
  Github, 
  CloudLightning, 
  Copy, 
  BookOpen, 
  Info
} from "lucide-react";

export default function CodeExporter() {
  const [activeFile, setActiveFile] = useState<"train" | "flask" | "req">("train");
  const [copied, setCopied] = useState(false);

  // File strings matching original created files
  const FILES = {
    train: `X = df['CleanText']
y = df['Sentiment'].str.lower().str.strip()

# Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_split=0.2, random_state=42)

# TF-IDF Vectorizer Fitting
vectorizer = TfidfVectorizer(max_features=2500, min_df=1, ngram_range=(1, 2))
X_train_vector = vectorizer.fit_transform(X_train)
X_test_vector = vectorizer.transform(X_test)

# Logistic Regression Fitting
model = LogisticRegression(class_weight='balanced', C=1.0)
model.fit(X_train_vector, y_train)`,
    
    flask: `from flask import Flask, request, jsonify
import sqlite3

app = Flask(__name__)

# Route for inference
@app.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.get_json() or {}
    text = data.get("text", "")
    
    # Predict with loaded model.pkl
    sentiment, confidence, score = predict_sentiment(text)
    
    # Save to SQLite database
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO analyses (text, sentiment, score, confidence)
        VALUES (?, ?, ?, ?)
    """, (text, sentiment, score, confidence))
    conn.commit()
    conn.close()
    
    return jsonify({"sentiment": sentiment, "score": score, "confidence": confidence})`,

    req: `flask>=3.0.0
gunicorn>=21.2.0
pandas>=2.0.0
numpy>=1.24.0
scikit-learn>=1.3.0
nltk>=3.8.0
textblob>=0.17.1
dill>=0.3.7`
  };

  const handleCopyCode = () => {
    let textToCopy = "";
    if (activeFile === "train") {
      textToCopy = FILES.train;
    } else if (activeFile === "flask") {
      textToCopy = FILES.flask;
    } else {
      textToCopy = FILES.req;
    }
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6" id="code-exporter-tab-panel">
      
      {/* EXPLANATIONS OF MACHINE LEARNING WORKFLOW */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h4 className="text-base font-bold font-sans text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-2">
          <BookOpen className="w-4.5 h-4.5 text-indigo-500" /> NLP & Machine Learning Workflow
        </h4>
        <p className="text-xs text-slate-400 mb-6 font-sans">
          This system implements a classic text mining pipeline suited for standard corporate customer-insights deployment.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
          {/* pre-processing step */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/65">
            <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center font-bold font-mono text-[11px] mb-2.5">01</span>
            <strong className="text-slate-805 dark:text-slate-200 block mb-1">Text NLP Preprocessing</strong>
            Custom regex strips symbols, tokenizes words, lowercase values. Excludes English stopwords ("the", "is", "and"). Lemma-stemming maps active suffixes ("crashes", "crashing") to a consolidated root ("crash").
          </div>

          {/* tfd-idf step */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/65">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold font-mono text-[11px] mb-2.5">02</span>
            <strong className="text-slate-805 dark:text-slate-200 block mb-1">TF-IDF Vectorization</strong>
            Stems mapped on an $N$-dimensional vector block. term frequency metrics multiplied by Inverse Document Frequency (logarithm scaling) scales down high-frequency redundant words, highlights predictive sentiment cues.
          </div>

          {/* softmax logit step */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/65">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-900/35 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold font-mono text-[11px] mb-2.5 font-sans">03</span>
            <strong className="text-slate-805 dark:text-slate-200 block mb-1 font-sans">Softmax Multi-Regression</strong>
            Computes a linear model for each class. Softmax normalizes exponents into real probability distributions. Training minimizes cross-entropy losses utilizing gradient descent with L2 Ridge decay penalizing parameters.
          </div>
        </div>
      </div>

      {/* CORE PORTFOLIO FILE VIEWERS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PICK CODE FILE PREVIEW */}
        <div className="lg:col-span-12 xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-205 dark:border-slate-800 pb-3 mb-4 font-sans">
              <h4 className="text-sm font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                <Code2 className="w-4.5 h-4.5 text-indigo-500" /> Exportable Python Snippets
              </h4>
              
              <button
                onClick={handleCopyCode}
                className="py-1 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs text-slate-650 dark:text-slate-350 flex items-center gap-1.5 font-bold transition-all active:scale-95 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-505" />
                <span>{copied ? "Copied!" : "Copy Snippet"}</span>
              </button>
            </div>

            {/* File navigator tabs */}
            <div className="flex gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl mb-4 text-xs font-mono select-none">
              <button
                onClick={() => setActiveFile("train")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-center font-semibold transition cursor-pointer ${
                  activeFile === "train" 
                    ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                train_model.py
              </button>
              <button
                onClick={() => setActiveFile("flask")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-center font-semibold transition cursor-pointer ${
                  activeFile === "flask" 
                    ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                app.py (Flask)
              </button>
              <button
                onClick={() => setActiveFile("req")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-center font-semibold transition cursor-pointer ${
                  activeFile === "req" 
                    ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                requirements.txt
              </button>
            </div>

            {/* Pseudo-editor preview window */}
            <div className="relative bg-[#0b0f19] text-slate-200 p-4.5 rounded-xl text-xs font-mono h-64 overflow-y-auto border border-slate-800 select-text leading-relaxed selection:bg-indigo-950/80 custom-scrollbar">
              <span className="absolute top-2 right-3 text-[9px] text-slate-600 font-mono tracking-wider">PYTHON PIPELINE</span>
              <pre className="whitespace-pre">{activeFile === "train" ? FILES.train : activeFile === "flask" ? FILES.flask : FILES.req}</pre>
            </div>
          </div>

          <div className="mt-4 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/30 rounded-xl text-[11px] text-slate-500 font-sans leading-relaxed flex items-center gap-1.5">
            <Info className="w-5 h-5 text-indigo-500 shrink-0" />
            <span>
              <strong>Note:</strong> Complete operational files with extensive comments are physically created inside the workspace root (look for <code>app.py</code> and <code>train_model.py</code> in your export packages!).
            </span>
          </div>
        </div>

        {/* DEPLOYMENT PROCESSES GUIDE */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
          
          {/* GITHUB DISPATCH PANEL */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h4 className="text-sm font-bold font-sans text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-3">
              <Github className="w-1.5 h-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-500 shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-800" /> GitHub Repository Upload Steps
            </h4>
            
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
              <p>For your portfolio, upload these physical files to GitHub using the terminal commands below:</p>
              
              <div className="bg-[#0b0f19] text-indigo-300 p-3 rounded-lg font-mono text-[10px] space-y-1 select-text h-32 overflow-y-auto border border-slate-800 custom-scrollbar">
                <p className="text-slate-600"># 1. Initialize local repository</p>
                <p>git init</p>
                <p>git add .</p>
                <p>git commit -m "feat: complete NLP Sentiment Studio"</p>
                <p className="text-slate-600"># 2. Map to your GitHub Repo</p>
                <p>git branch -M main</p>
                <p>git remote add origin https://github.com/your-username/sentiment-analysis-flask.git</p>
                <p>git push -u origin main</p>
              </div>
            </div>
          </div>

          {/* RENDER HOSTING DEPLOY SERVICES */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h4 className="text-sm font-bold font-sans text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-3">
              <CloudLightning className="w-4.5 h-4.5 text-amber-500" /> Render Web Service Deployments
            </h4>

            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
              <p>Host the compiled Python Flask API for free on <strong className="text-slate-800 dark:text-slate-200">Render</strong>:</p>
              
              <div className="space-y-3.5">
                <div className="flex gap-2.5 items-start">
                  <span className="w-4 h-4 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-full flex items-center justify-center font-bold font-mono text-[10px] shrink-0 mt-0.5">1</span>
                  <div>
                    <span className="font-bold block text-slate-800 dark:text-slate-200 leading-none">Register Web Service</span>
                    Connect your newly populated GitHub repository to Render and create a new Web Service.
                  </div>
                </div>

                <div className="flex gap-2.5 items-start">
                  <span className="w-4 h-4 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-full flex items-center justify-center font-bold font-mono text-[10px] shrink-0 mt-0.5">2</span>
                  <div>
                    <span className="font-bold block text-slate-800 dark:text-slate-200 leading-none">Configure Build Command</span>
                    <code className="bg-[#0b0f19] text-amber-500 border border-slate-800 text-[10px] px-1.5 py-0.5 rounded font-mono mt-1 block w-fit">
                      pip install -r requirements.txt && python train_model.py
                    </code>
                  </div>
                </div>

                <div className="flex gap-2.5 items-start">
                  <span className="w-4 h-4 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-full flex items-center justify-center font-bold font-mono text-[10px] shrink-0 mt-0.5">3</span>
                  <div>
                    <span className="font-bold block text-slate-800 dark:text-slate-200 leading-none">Configure Start Command</span>
                    <code className="bg-[#0b0f19] text-amber-500 border border-slate-800 text-[10px] px-1.5 py-0.5 rounded font-mono mt-1 block w-fit">
                      gunicorn app:app
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
