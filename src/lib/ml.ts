/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatasetItem } from "./dataset.js";

// Standard stop words list
export const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", 
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", 
  "by", "can", "cannot", "could", "did", "do", "does", "doing", "down", "during", "each", "few", 
  "for", "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", 
  "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "me", "more", 
  "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", 
  "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so", "some", "such", 
  "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they", 
  "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "we", "were", 
  "what", "when", "where", "which", "while", "who", "whom", "why", "with", "you", "your", "yours", 
  "yourself", "yourselves"
]);

/**
 * Basic English stemmer implementing common suffix stemming rules
 */
export function stemWord(word: string): string {
  let w = word.toLowerCase().trim();
  if (w.length <= 2) return w;

  // Save common possessives and plurals
  if (w.endsWith("'s")) w = w.slice(0, -2);
  if (w.endsWith("s'")) w = w.slice(0, -2);

  // Common suffix reductions
  if (w.endsWith("sses")) {
    w = w.slice(0, -2); // classes -> classe
  } else if (w.endsWith("ies")) {
    w = w.slice(0, -3) + "i"; // families -> famili
  } else if (w.endsWith("ss")) {
    // leave as is
  } else if (w.endsWith("s") && !w.endsWith("us") && !w.endsWith("is") && !w.endsWith("as")) {
    w = w.slice(0, -1);
  }

  if (w.endsWith("eed")) {
    if (w.length > 4) w = w.slice(0, -1); // agreed -> agree, agreed -> agree
  } else if (w.endsWith("ing")) {
    w = w.slice(0, -3);
    if (w.endsWith("at") || w.endsWith("bl") || w.endsWith("iz")) {
      w = w + "e"; // duplicating -> duplicate, bubbling -> bubble
    } else if (w.endsWith("bb") || w.endsWith("dd") || w.endsWith("ff") || w.endsWith("gg") || w.endsWith("mm") || w.endsWith("nn") || w.endsWith("pp") || w.endsWith("rr") || w.endsWith("tt")) {
      w = w.slice(0, -1); // running -> run, chatting -> chat
    } else if (w.endsWith("i")) {
      w = w.slice(0, -1) + "y"; // dying -> dy -> dy -> die
    }
  } else if (w.endsWith("ed") && !w.endsWith("eed")) {
    w = w.slice(0, -2);
    if (w.endsWith("at") || w.endsWith("bl") || w.endsWith("iz")) {
      w = w + "e"; // created -> create
    } else if (w.endsWith("bb") || w.endsWith("dd") || w.endsWith("ff") || w.endsWith("gg") || w.endsWith("mm") || w.endsWith("nn") || w.endsWith("pp") || w.endsWith("rr") || w.endsWith("tt")) {
      w = w.slice(0, -1); // planned -> plan
    }
  }

  if (w.endsWith("y") && w.length > 3) {
    w = w.slice(0, -1) + "i"; // happily -> happi
  }

  // Common derivational suffixes
  if (w.endsWith("ational")) {
    w = w.slice(0, -7) + "ate"; // relational -> relate
  } else if (w.endsWith("tional")) {
    w = w.slice(0, -6) + "tion"; // conditional -> condition
  } else if (w.endsWith("izer")) {
    w = w.slice(0, -1); // localizer -> localize
  } else if (w.endsWith("alli") || w.endsWith("fully") || w.endsWith("ly")) {
    if (w.endsWith("alli")) w = w.slice(0, -2); // drastically -> drastic
    else if (w.endsWith("fully")) w = w.slice(0, -2); // beautifully -> beautiful
    else w = w.slice(0, -2); // incredibly -> incredib
  }

  return w;
}

export interface PreprocessingStepResult {
  original: string;
  lowercased: string;
  tokens: string[];
  noStopwords: string[];
  stemmed: string[];
}

/**
 * Full preprocessing pipeline
 */
export function preprocessText(text: string): PreprocessingStepResult {
  const original = text;
  const lowercased = text.toLowerCase();
  
  // Regex to tokenize words, removing punctuation
  const rawTokens = lowercased.match(/[a-z0-9']+/gi) || [];
  
  const tokens = rawTokens.map(t => t.trim()).filter(t => t.length > 0);
  const noStopwords = tokens.filter(t => !STOP_WORDS.has(t));
  const stemmed = noStopwords.map(t => stemWord(t));

  return {
    original,
    lowercased,
    tokens,
    noStopwords,
    stemmed,
  };
}

/**
 * TF-IDF Vectorizer class
 */
export class TfIdfVectorizer {
  vocabulary: string[] = [];
  vocabMap: Map<string, number> = new Map();
  idf: number[] = [];
  documentCount = 0;

  fit(documents: string[][]) {
    this.documentCount = documents.length;
    const dfMap: Map<string, number> = new Map();

    // Compute document frequency (DF) for each word
    documents.forEach(doc => {
      const uniqueWords = new Set(doc);
      uniqueWords.forEach(word => {
        dfMap.set(word, (dfMap.get(word) || 0) + 1);
      });
    });

    // Build vocabulary with words appearing in more than 1 document (to reduce noise)
    // or all words if dataset is small
    const dfThreshold = this.documentCount > 1000 ? 1 : 0;
    this.vocabulary = [];
    dfMap.forEach((count, word) => {
      if (count > dfThreshold && word.length > 1) {
        this.vocabulary.push(word);
      }
    });

    // Sort alphabetically for stability
    this.vocabulary.sort();

    // Map word to its index
    this.vocabMap.clear();
    this.vocabulary.forEach((word, index) => {
      this.vocabMap.set(word, index);
    });

    // Compute IDF: idf = ln(1 + documentCount / (1 + df))
    this.idf = new Array(this.vocabulary.length);
    this.vocabulary.forEach((word, index) => {
      const df = dfMap.get(word) || 0;
      this.idf[index] = Math.log(1 + this.documentCount / (1 + df)) + 1; // standard smooth formula
    });
  }

  transform(doc: string[]): number[] {
    const tfVector = new Array(this.vocabulary.length).fill(0);
    doc.forEach(word => {
      const idx = this.vocabMap.get(word);
      if (idx !== undefined) {
        tfVector[idx] += 1;
      }
    });

    // Convert to TF-IDF & L2 Normalize the vector
    const tfIdfVector = new Array(this.vocabulary.length).fill(0);
    let sumSquares = 0;
    for (let i = 0; i < this.vocabulary.length; i++) {
      if (tfVector[i] > 0) {
        // Log-scaling TF
        const tf = 1 + Math.log(tfVector[i]);
        tfIdfVector[i] = tf * this.idf[i];
        sumSquares += tfIdfVector[i] * tfIdfVector[i];
      }
    }

    // L2 normalization to prevent document length bias
    const magnitude = Math.sqrt(sumSquares);
    if (magnitude > 0) {
      for (let i = 0; i < this.vocabulary.length; i++) {
        tfIdfVector[i] = tfIdfVector[i] / magnitude;
      }
    }

    return tfIdfVector;
  }
}

export type SentimentClass = 'negative' | 'neutral' | 'positive';

export interface ClassMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  support: number;
}

export interface ModelEvaluation {
  accuracy: number;
  precision: number; // Macro precision
  recall: number;    // Macro recall
  f1Score: number;   // Macro F1-score
  metricsPerClass: Record<SentimentClass, ClassMetrics>;
  confusionMatrix: number[][]; // 3x3 [actual][predicted]
}

export interface EpochLog {
  epoch: number;
  loss: number;
  accuracy: number;
}

/**
 * Three-class Softmax Logistic Regression Classifier
 */
export class LogisticRegressionClassifier {
  weights: number[][] = []; // [classIndex][featureIndex]
  biases: number[] = [];    // [classIndex]
  classes: SentimentClass[] = ['negative', 'neutral', 'positive']; // Indexes: 0, 1, 2

  initialize(numFeatures: number) {
    this.weights = Array.from({ length: 3 }, () => new Array(numFeatures).fill(0));
    this.biases = new Array(3).fill(0);
  }

  /**
   * Softmax calculation helper
   */
  softmax(scores: number[]): number[] {
    const maxScore = Math.max(...scores); // for numerical stability
    const exps = scores.map(s => Math.exp(s - maxScore));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sumExps);
  }

  /**
   * Predict probability values for classes [Negative, Neutral, Positive]
   */
  predictProbs(features: number[]): number[] {
    const scores = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      let score = this.biases[c];
      for (let f = 0; f < features.length; f++) {
        score += this.weights[c][f] * features[f];
      }
      scores[c] = score;
    }
    return this.softmax(scores);
  }

  /**
   * Train Softmax Logistic Regression using gradient descent
   */
  fit(
    X: number[][],
    y: number[], // Class indices: 0, 1, 2
    epochs = 100,
    learningRate = 0.2,
    lambda = 0.01 // L2 Regularization coefficient
  ): EpochLog[] {
    const N = X.length;
    const numFeatures = X[0]?.length || 0;
    this.initialize(numFeatures);

    const logs: EpochLog[] = [];

    for (let epoch = 1; epoch <= epochs; epoch++) {
      let epochLoss = 0;
      let epochCorrect = 0;

      // Gradient arrays
      const dWeights = Array.from({ length: 3 }, () => new Array(numFeatures).fill(0));
      const dBiases = new Array(3).fill(0);

      for (let i = 0; i < N; i++) {
        const x_i = X[i];
        const y_i = y[i];

        // Forward propagation
        const probs = this.predictProbs(x_i);

        // Compute loss: Cross-entropy L = -log(probs[y_i])
        epochLoss -= Math.log(probs[y_i] + 1e-15);

        // Find predicted class
        const predClass = probs.indexOf(Math.max(...probs));
        if (predClass === y_i) {
          epochCorrect++;
        }

        // Gradients calculation
        for (let c = 0; c < 3; c++) {
          const target = c === y_i ? 1 : 0;
          const error = probs[c] - target; // P_c - Y_c

          for (let f = 0; f < numFeatures; f++) {
            dWeights[c][f] += error * x_i[f];
          }
          dBiases[c] += error;
        }
      }

      // Average gradients, add L2 regularization gradient, and update weights
      for (let c = 0; c < 3; c++) {
        for (let f = 0; f < numFeatures; f++) {
          const gradW = (dWeights[c][f] / N) + (lambda * this.weights[c][f]);
          this.weights[c][f] -= learningRate * gradW;
        }
        const gradB = dBiases[c] / N;
        this.biases[c] -= learningRate * gradB;
      }

      // Add regularized loss
      let l2Penalty = 0;
      for (let c = 0; c < 3; c++) {
        for (let f = 0; f < numFeatures; f++) {
          l2Penalty += this.weights[c][f] * this.weights[c][f];
        }
      }
      epochLoss = (epochLoss / N) + (0.5 * lambda * l2Penalty);

      logs.push({
        epoch,
        loss: epochLoss,
        accuracy: epochCorrect / N
      });
    }

    return logs;
  }
}

/**
 * Split dataset into train and test sets
 */
export function trainTestSplit<T>(dataset: T[], testRatio = 0.2, seed = 42): { train: T[], test: T[] } {
  // Simple seeded pseudorandom shuffle
  const shuffled = [...dataset];
  let m = shuffled.length, t, i;
  let rand = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  while (m) {
    i = Math.floor(rand() * m--);
    t = shuffled[m];
    shuffled[m] = shuffled[i];
    shuffled[i] = t;
  }

  const splitIndex = Math.floor(shuffled.length * (1 - testRatio));
  return {
    train: shuffled.slice(0, splitIndex),
    test: shuffled.slice(splitIndex)
  };
}

export interface PredictiveFeature {
  word: string;
  weight: number;
}

export interface ModelStats {
  accuracy: number;
  vocabSize: number;
  documentCount: number;
  evaluation: ModelEvaluation;
  topWordsPerClass: Record<SentimentClass, PredictiveFeature[]>;
  trainingHistory: EpochLog[];
}

/**
 * Comprehensive Sentiment Studio Machine Learning Pipeline
 */
export class SentimentMLPipeline {
  vectorizer: TfIdfVectorizer;
  classifier: LogisticRegressionClassifier;
  trainingMetrics: ModelEvaluation | null = null;
  trainHistoryLogs: EpochLog[] = [];
  lastTrainDatasetCount = 0;

  constructor() {
    this.vectorizer = new TfIdfVectorizer();
    this.classifier = new LogisticRegressionClassifier();
  }

  /**
   * Train ML system on given dataset
   */
  train(dataset: DatasetItem[], testRatio = 0.2): EpochLog[] {
    this.lastTrainDatasetCount = dataset.length;

    // 1. Split into train and test
    const { train, test } = trainTestSplit(dataset, testRatio);

    // 2. Preprocess documents
    const trainPreprocessedDocs = train.map(item => preprocessText(item.text).stemmed);
    const testPreprocessedDocs = test.map(item => preprocessText(item.text).stemmed);

    // 3. Fit TF-IDF on training corpus
    this.vectorizer.fit(trainPreprocessedDocs);

    // 4. Transform training & testing corpus to vectors
    const X_train = trainPreprocessedDocs.map(doc => this.vectorizer.transform(doc));
    const X_test = testPreprocessedDocs.map(doc => this.vectorizer.transform(doc));

    const sentimentToIndex: Record<SentimentClass, number> = { negative: 0, neutral: 1, positive: 2 };
    const y_train = train.map(item => sentimentToIndex[item.sentiment]);
    const y_test = test.map(item => sentimentToIndex[item.sentiment]);

    // 5. Train classifier (Softmax Logistic Regression)
    const epochs = 1000;
    const learningRate = 1.2;
    const lambda = 0.001; // sweet-spot regularization
    this.trainHistoryLogs = this.classifier.fit(X_train, y_train, epochs, learningRate, lambda);

    // 6. Evaluate model performance on test set
    this.trainingMetrics = this.evaluate(X_test, y_test);

    return this.trainHistoryLogs;
  }

  /**
   * Evaluate model predictions
   */
  evaluate(X: number[][], y: number[]): ModelEvaluation {
    const N = X.length;
    let correct = 0;

    // Confusion Matrix: actual as rows, predicted as columns
    const cm = [
      [0, 0, 0], // Actual: Negative
      [0, 0, 0], // Actual: Neutral
      [0, 0, 0]  // Actual: Positive
    ];

    for (let i = 0; i < N; i++) {
      const probs = this.classifier.predictProbs(X[i]);
      const pred = probs.indexOf(Math.max(...probs));
      const actual = y[i];

      cm[actual][pred] += 1;
      if (pred === actual) {
         correct++;
      }
    }

    const accuracy = N > 0 ? correct / N : 0;

    // Calculate precision, recall, f1-score per sentiment class
    const classes: SentimentClass[] = ['negative', 'neutral', 'positive'];
    const metricsPerClass = {} as Record<SentimentClass, ClassMetrics>;

    let macroPrecision = 0;
    let macroRecall = 0;
    let macroF1 = 0;

    for (let c = 0; c < 3; c++) {
      const className = classes[c];
      
      const tp = cm[c][c];
      
      // Predicted positive for class c: column sum
      let predPos = 0;
      for (let i = 0; i < 3; i++) predPos += cm[i][c];

      // Actual positive for class c: row sum (support)
      let actualPos = 0;
      for (let j = 0; j < 3; j++) actualPos += cm[c][j];

      const precision = predPos > 0 ? tp / predPos : 0;
      const recall = actualPos > 0 ? tp / actualPos : 0;
      const f1Score = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

      metricsPerClass[className] = {
        precision,
        recall,
        f1Score,
        support: actualPos
      };

      macroPrecision += precision;
      macroRecall += recall;
      macroF1 += f1Score;
    }

    return {
      accuracy,
      precision: macroPrecision / 3,
      recall: macroRecall / 3,
      f1Score: macroF1 / 3,
      metricsPerClass,
      confusionMatrix: cm
    };
  }

  /**
   * Analyze custom user text input and compute sentiment
   */
  analyze(text: string): {
    sentiment: SentimentClass;
    confidence: number;
    score: number; // -1 to +1 scale
    probabilities: Record<SentimentClass, number>;
    preprocessingLog: PreprocessingStepResult;
  } {
    const prep = preprocessText(text);
    const vector = this.vectorizer.transform(prep.stemmed);
    const probs = this.classifier.predictProbs(vector);

    const maxProbIdx = probs.indexOf(Math.max(...probs));
    const classes: SentimentClass[] = ['negative', 'neutral', 'positive'];
    const sentiment = classes[maxProbIdx];
    const confidence = probs[maxProbIdx];

    // Compute float Sentiment Score from -1.0 to 1.0
    // Weighted score approach: Neg is -1, Neu is 0, Pos is +1
    // score = probs[pos] * 1.0 + probs[neu] * 0.0 + probs[neg] * -1.0
    const score = probs[2] - probs[0];

    return {
      sentiment,
      confidence,
      score,
      probabilities: {
        negative: probs[0],
        neutral: probs[1],
        positive: probs[2]
      },
      preprocessingLog: prep
    };
  }

  /**
   * Retrieve words with strongest coefficients for each class
   */
  getTopPredictiveWords(topCount = 10): Record<SentimentClass, PredictiveFeature[]> {
    const classes: SentimentClass[] = ['negative', 'neutral', 'positive'];
    const result = {
      negative: [] as PredictiveFeature[],
      neutral: [] as PredictiveFeature[],
      positive: [] as PredictiveFeature[]
    };

    if (this.classifier.weights.length === 0) return result;

    classes.forEach((className, classIdx) => {
      const classWeights = this.classifier.weights[classIdx];
      const wordWeights: PredictiveFeature[] = this.vectorizer.vocabulary.map((word, wordIdx) => {
        return {
          word,
          weight: classWeights[wordIdx] || 0
        };
      });

      // Sort by absolute weight value or relative positive influence?
      // Since it's Softmax, a high positive weight in index 2 strictly pushes probability towards Positive.
      // So sorting descending gives the words most heavily contributing to that class.
      const sorted = wordWeights.sort((a, b) => b.weight - a.weight);
      result[className] = sorted.slice(0, topCount);
    });

    return result;
  }

  /**
   * Pack everything into a detailed visual statistics status
   */
  getStats(): ModelStats {
    if (!this.trainingMetrics) {
      // Return empty evaluate stats
      return {
        accuracy: 0,
        vocabSize: 0,
        documentCount: 0,
        evaluation: {
          accuracy: 0,
          precision: 0,
          recall: 0,
          f1Score: 0,
          metricsPerClass: {
            negative: { precision: 0, recall: 0, f1Score: 0, support: 0 },
            neutral: { precision: 0, recall: 0, f1Score: 0, support: 0 },
            positive: { precision: 0, recall: 0, f1Score: 0, support: 0 }
          },
          confusionMatrix: [[0,0,0],[0,0,0],[0,0,0]]
        },
        topWordsPerClass: { negative: [], neutral: [], positive: [] },
        trainingHistory: []
      };
    }

    return {
      accuracy: this.trainingMetrics.accuracy,
      vocabSize: this.vectorizer.vocabulary.length,
      documentCount: this.lastTrainDatasetCount,
      evaluation: this.trainingMetrics,
      topWordsPerClass: this.getTopPredictiveWords(15),
      trainingHistory: this.trainHistoryLogs
    };
  }
}

// Singleton pipeline instance managed on backend
export const mlPipeline = new SentimentMLPipeline();
