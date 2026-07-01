# -*- coding: utf-8 -*-
"""
Full-stack Sentiment Analysis Web Application backend in Python/Flask.
Connects with a SQLite database ('database.db') to log persistent records.
Infers sentiment with scikit-learn Logistic Regression and tf-idf vectorizer models.
"""

import os
import re
import pickle
import sqlite3
import numpy as np
import pandas as pd
from datetime import datetime
from flask import Flask, request, jsonify, render_template, send_file

app = Flask(__name__, static_folder="static", template_folder="templates")
DATABASE_PATH = "database.db"

# Lazy-load Model Pickle variables
MODEL = None
VECTORIZER = None

def init_sqlite_db():
    """
    Initializes local SQLite database and structure schemas if not present.
    Creates table 'analyses' for historical logging.
    """
    # Create database connection
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            sentiment TEXT NOT NULL,
            score REAL NOT NULL,
            confidence REAL NOT NULL,
            source TEXT NOT NULL,
            tag TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
    print("SQLite Database initialized successfully with 'analyses' table.")

def load_ml_pickles():
    """
    Ensures scikit-learn models pickles are active.
    Loads models recursively from root.
    """
    global MODEL, VECTORIZER
    if MODEL is not None and VECTORIZER is not None:
        return True

    model_path = "model.pkl"
    vect_path = "vectorizer.pkl"

    if os.path.exists(model_path) and os.path.exists(vect_path):
        try:
            with open(model_path, "rb") as f:
                MODEL = pickle.load(f)
            with open(vect_path, "rb") as f2:
                VECTORIZER = pickle.load(f2)
            print("Successfully loaded scikit-learn vectorizer and logistic pickles!")
            return True
        except Exception as e:
            print(f"Error loading model pickles files: {e}")
            return False
    else:
        print("Model pickles not found. Training simulation fallback active.")
        return False

def fallback_sentiment_score(text):
    """
    Simple rule-based heuristic fallback if machine learning model is not yet compiled.
    Uses bag-of-words keywords to return class, confidence, score.
    """
    cleaned = text.lower()
    pos_words = {"love", "awesome", "incredible", "stun", "stunning", "great", "delicious", "perfect", "excellent", "best", "happy", "swift", "smooth"}
    neg_words = {"worst", "waste", "crash", "overheat", "rude", "poor", "broken", "bad", "terrible", "awful", "static", "freeze", "blurry", "lazy"}

    words = re.findall(r"[a-z']+", cleaned)
    pos_count = sum(1 for w in words if w in pos_words)
    neg_count = sum(1 for w in words if w in neg_words)

    total_hits = pos_count + neg_count
    if total_hits == 0:
        return "neutral", 0.70, 0.00
    
    score = (pos_count - neg_count) / total_hits
    confidence = 0.50 + (abs(score) * 0.45) # scale to 0.5 - 0.95

    sentiment = "neutral"
    if score >= 0.25:
        sentiment = "positive"
    elif score <= -0.25:
        sentiment = "negative"

    return sentiment, confidence, score

def preprocess_text_nlp(text):
    """
    Conforms strings to matched training vocabulary formatting
    """
    t = text.lower().strip()
    t = re.sub(r"[^a-zA-Z'\s]", " ", t)
    return " ".join(t.split())

def predict_sentiment(text):
    """
    Runs model pipeline.
    Returns: sentiment_class, confidence, score_index
    """
    has_pickles = load_ml_pickles()
    
    if not has_pickles:
        # fallback rules
        return fallback_sentiment_score(text)
    
    try:
        clean = preprocess_text_nlp(text)
        vectorized = VECTORIZER.transform([clean])
        
        # Predict probability array
        probs = MODEL.predict_proba(vectorized)[0] # Shape: [num_classes]
        classes = MODEL.classes_ # e.g. ['negative', 'neutral', 'positive']
        
        max_idx = np.argmax(probs)
        sentiment = classes[max_idx]
        confidence = probs[max_idx]

        # Score calculations: weights mapping
        # Score index: mapping Neg to -1, Neu to 0, Pos to 1 on a simple scale
        neg_p = probs[np.where(classes == 'negative')[0][0]] if 'negative' in classes else 0
        pos_p = probs[np.where(classes == 'positive')[0][0]] if 'positive' in classes else 0
        score = pos_p - neg_p

        return sentiment, float(confidence), float(score)

    except Exception as e:
        print(f"ML Pipeline evaluation error, invoking fallback: {e}")
        return fallback_sentiment_score(text)


# FLASK HTTP ENDPOINTS

@app.route("/")
def index():
    """
    Serve front-end UI page
    """
    return jsonify({
        "status": "online",
        "message": "Sentiment Analysis Python Flask API works successfully!",
        "instructions": "In a complete deployment, this serves templates/index.html. Exposes /analyze, /history, /stats.",
        "model_loaded": load_ml_pickles()
    })

@app.route("/api/analyze", methods=["POST"])
def analyze():
    """
    Single review text evaluation.
    Persists data in SQLite database.
    """
    data = request.get_json() or {}
    text = data.get("text", "").strip()
    source = data.get("source", "Single Input").strip()
    tag = data.get("tag", "General").strip()

    if not text:
        return jsonify({"error": "Empty text submission"}), 400

    # Execute ML / Fallback Pipeline
    sentiment, confidence, score = predict_sentiment(text)

    # Save to SQLite database
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO analyses (text, sentiment, score, confidence, source, tag)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (text, sentiment, score, confidence, source, tag))
        conn.commit()
        record_id = cursor.lastrowid
        conn.close()
    except Exception as e:
        print(f"SQLite DB saving error: {e}")
        record_id = None

    return jsonify({
        "id": record_id,
        "text": text,
        "sentiment": sentiment,
        "score": score,
        "confidence": confidence,
        "source": source,
        "tag": tag,
        "timestamp": datetime.now().isoformat()
    })

@app.route("/api/history", methods=["GET"])
def history():
    """
    Fetch history logs with filter sorting and SQLite queries.
    """
    search_q = request.args.get("search", "").strip().lower()
    sent_filter = request.args.get("sentiment", "").strip().lower()

    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    query = "SELECT * FROM analyses WHERE 1=1"
    params = []

    if search_q:
        query += " AND (LOWER(text) LIKE ? OR LOWER(tag) LIKE ?)"
        params.extend([f"%{search_q}%", f"%{search_q}%"])
    
    if sent_filter:
        query += " AND LOWER(sentiment) = ?"
        params.append(sent_filter)

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "text": r["text"],
            "sentiment": r["sentiment"],
            "score": r["score"],
            "confidence": r["confidence"],
            "source": r["source"],
            "tag": r["tag"],
            "timestamp": r["timestamp"]
        })

    return jsonify(results)

@app.route("/api/stats", methods=["GET"])
def stats():
    """
    SQL aggregate calculations of system histories.
    """
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Calculate totals
    cursor.execute("SELECT COUNT(*) FROM analyses")
    total = cursor.fetchone()[0]

    if total == 0:
        conn.close()
        return jsonify({
            "totalAnalyzed": 0, "positiveCount": 0, "neutralCount": 0, "negativeCount": 0, "averageScore": 0.00
        })

    # Counts per class
    cursor.execute("SELECT sentiment, COUNT(*) FROM analyses GROUP BY sentiment")
    counts = dict(cursor.fetchall())

    cursor.execute("SELECT AVG(score) FROM analyses")
    avg_score = cursor.fetchone()[0] or 0.0

    conn.close()

    positive = counts.get("positive", 0)
    negative = counts.get("negative", 0)
    neutral = counts.get("neutral", 0)

    return jsonify({
        "totalAnalyzed": total,
        "positiveCount": positive,
        "negativeCount": negative,
        "neutralCount": neutral,
        "averageScore": float(avg_score),
        "positivePercentage": int((positive / total) * 100) if total > 0 else 0,
        "negativePercentage": int((negative / total) * 100) if total > 0 else 0,
        "neutralPercentage": int((neutral / total) * 100) if total > 0 else 0,
    })

@app.route("/api/history/clear", methods=["POST"])
def clear_history():
    """Loads SQLite flush query"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM analyses")
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "SQLite history cleared successfully."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Initializing parameters on start
init_sqlite_db()
load_ml_pickles()

if __name__ == "__main__":
    # Bind to standard Port 5000 in Flask
    # Serve locally in dev
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
