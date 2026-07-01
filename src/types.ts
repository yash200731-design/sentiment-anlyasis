/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SentimentClass = 'negative' | 'neutral' | 'positive';

export interface HistoryItem {
  id: string;
  text: string;
  sentiment: SentimentClass;
  score: number;
  confidence: number;
  timestamp: string;
  source: string;
  tag?: string;
}

export interface SummaryStats {
  totalAnalyzed: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  averageScore: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
}

export interface PreprocessingStepResult {
  original: string;
  lowercased: string;
  tokens: string[];
  noStopwords: string[];
  stemmed: string[];
}

export interface ClassMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  support: number;
}

export interface ModelEvaluation {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  metricsPerClass: Record<SentimentClass, ClassMetrics>;
  confusionMatrix: number[][];
}

export interface EpochLog {
  epoch: number;
  loss: number;
  accuracy: number;
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

export interface AnalysisResponse {
  id: string;
  timestamp: string;
  analysis: {
    sentiment: SentimentClass;
    confidence: number;
    score: number;
    probabilities: Record<SentimentClass, number>;
    preprocessingLog: PreprocessingStepResult;
  };
  aiSuggestions: string | null;
}

export interface AISuggestion {
  id: string;
  title: string;
  category: string;
  sentimentFocus: 'Positive' | 'Negative' | 'Neutral' | 'Both';
  impact: 'High' | 'Medium' | 'Low';
  explanation: string;
  actionPlan: string[];
}

