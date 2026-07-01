# -*- coding: utf-8 -*-
"""
Sentiment Analysis ML training script
Trains a TF-IDF + Logistic Regression Classifier on parsed review datasets.
Suitable for a Data Science Internship Portfolio showing scikit-learn and NLTK.
"""

import os
import re
import pickle
import pandas as pd
import numpy as np

# NLP Libraries
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# Machine Learning
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# Ensure NLTK resources are downloaded safely
print("Verifying NLTK downloads...")
resources = ['stopwords', 'wordnet', 'omw-1.4', 'punkt']
for r in resources:
    try:
        nltk.download(r, quiet=True)
    except Exception as e:
         print(f"Warning: Could not download NLTK resource {r}: {e}")

def preprocess_text(text):
    """
    NLP Preprocessing Pipeline:
    1. Lowercasing
    2. Punctuation and numeric removal
    3. Tokenization
    4. Stopwords extraction
    5. Lemmatization
    """
    if not isinstance(text, str):
        return ""
    
    # 1. Lowercase
    text = text.lower().strip()
    
    # 2. Keep only letters and single quotes
    text = re.sub(r"[^a-zA-Z'\s]", " ", text)
    
    # 3. Tokenize on whitespace
    tokens = text.split()
    
    # 4. Filter out standard English stopwords
    try:
        stop_words = set(stopwords.words('english'))
    except:
        # Fallback list if NLTK stopwords failed to open
        stop_words = set(["is", "the", "a", "an", "and", "in", "it", "to", "for", "with", "on", "of", "this"])
        
    filtered_tokens = [w for w in tokens if w not in stop_words]
    
    # 5. Lemmatize words to their dictionary root form
    try:
        lemmatizer = WordNetLemmatizer()
        lemmatized_tokens = [lemmatizer.lemmatize(w) for w in filtered_tokens]
    except:
        # Fallback suffix lemmatization if NLTK failed
        lemmatized_tokens = filtered_tokens
        
    return " ".join(lemmatized_tokens)

def main():
    print("="*60)
    print("SENTIMENT ANALYSIS STUDIO: TRAINING ENGINE")
    print("="*60)

    dataset_path = "dataset/sentiment_data.csv"
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Missing dataset at mapping {dataset_path}. Run dataset generation first.")

    # 1. Read dataset CSV
    print(f"Loading feedback dataset from {dataset_path}...")
    df = pd.read_csv(dataset_path)
    
    # Normalize col names
    df.columns = [c.strip().title() for c in df.columns]
    
    # Verify cols
    text_col = [c for c in df.columns if 'Text' in c or 'Review' in c][0]
    target_col = [c for c in df.columns if 'Sentiment' in c or 'Class' in c][0]

    print(f"Discovered columns: Text='{text_col}', Sentiment='{target_col}'")
    print(f"Total dataset index length: {len(df)} samples.")

    # 2. Run reviews pre-processing
    print("Starting NLP preprocessing (tokenization, filtering, lemmatization)...")
    df['CleanText'] = df[text_col].apply(preprocess_text)

    # 3. Splitting into Train and Test splits (80-20 partition)
    X = df['CleanText']
    y = df[target_col].str.lower().str.strip()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_split=0.2, random_state=42, stratify=y
    )

    print(f"Partitions: Train set count = {len(X_train)} | Test split count = {len(X_test)} samples.")

    # 4. Fit TF-IDF Vectorizer
    print("Fitting TF-IDF Vectorizer weights...")
    vectorizer = TfidfVectorizer(max_features=2500, min_df=1, ngram_range=(1, 2))
    
    X_train_vectorized = vectorizer.fit_transform(X_train)
    X_test_vectorized = vectorizer.transform(X_test)

    print(f"Vocabulary size vectorized: {len(vectorizer.vocabulary_)} n-grams.")

    # 5. Train Logistic Regression Classifier
    print("Training Multiclass Logistic Regression classifier...")
    model = LogisticRegression(class_weight='balanced', C=1.0, max_iter=200)
    model.fit(X_train_vectorized, y_train)

    # 6. Evaluation metrics reports
    y_pred = model.predict(X_test_vectorized)
    accuracy = accuracy_score(y_test, y_pred)
    
    print("\n" + "="*30 + " EVALUATION REPORT " + "="*30)
    print(f"Classification test-set accuracy: {accuracy:.4f} ({(accuracy*100):.1f}%)")
    print("\nDetailed Performance Metrics:")
    print(classification_report(y_test, y_pred))
    
    print("Confusion Matrix:")
    labels = sorted(y.unique())
    cm = confusion_matrix(y_test, y_pred, labels=labels)
    cm_df = pd.DataFrame(cm, index=[f"Actual {l}" for l in labels], columns=[f"Pred {l}" for l in labels])
    print(cm_df)
    print("="*79 + "\n")

    # 7. Dump pickups models
    print("Saving ML pickles pipelines...")
    with open("vectorizer.pkl", "wb") as f:
        pickle.dump(vectorizer, f)
        
    with open("model.pkl", "wb") as f:
        pickle.dump(model, f)

    print("Success! 'vectorizer.pkl' and 'model.pkl' successfully generated inside the root directory.")
    print("Ready for Flask web production server hot deploys!")

if __name__ == "__main__":
    main()
