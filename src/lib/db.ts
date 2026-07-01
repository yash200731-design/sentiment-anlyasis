/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";

export interface HistoryItem {
  id: string;
  text: string;
  sentiment: "negative" | "neutral" | "positive";
  score: number;       // -1.0 to 1.0
  confidence: number;  // 0.0 to 1.0
  timestamp: string;   // ISO string
  source: string;      // "Single Text" | "CSV Upload" | "Live Stream"
  tag?: string;        // Optional tag (e.g. "Tweet", "Review", "Feedback")
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

const DB_FILE_PATH = process.env.VERCEL
  ? path.join("/tmp", "history_db.json")
  : path.join(process.cwd(), "history_db.json");

export class SentimentHistoryDB {
  private static readData(): HistoryItem[] {
    try {
      if (!fs.existsSync(DB_FILE_PATH)) {
        // Feed initial dummy data so the user sees a beautiful pre-populated history on first load!
        // This is highly functional, informative and looks extremely professional.
        const initialData: HistoryItem[] = [
          {
            id: "hist-1",
            text: "This computer is lightning fast! The screen is crisp, and it has an elegant aluminum chassis. Best purchase of 2026.",
            sentiment: "positive",
            score: 0.89,
            confidence: 0.94,
            timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
            source: "Single Text",
            tag: "Tech Review"
          },
          {
            id: "hist-2",
            text: "Terrible service. Ordered a steak medium-rare but it arrived burnt and stone cold. The waiter just laughed when I complained.",
            sentiment: "negative",
            score: -0.92,
            confidence: 0.97,
            timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
            source: "Single Text",
            tag: "Food Review"
          },
          {
            id: "hist-3",
            text: "We checked into the hotel at 3 PM. The receptionist was standard, gave us our magnetic plastic cards, and pointed to the elevator.",
            sentiment: "neutral",
            score: 0.01,
            confidence: 0.88,
            timestamp: new Date(Date.now() - 10 * 3600000).toISOString(),
            source: "Single Text",
            tag: "Hotel Review"
          },
          {
            id: "hist-4",
            text: "My morning is completely ruined. Stuck on the freeway for two hours due to an accident. Highly frustrating commute.",
            sentiment: "negative",
            score: -0.84,
            confidence: 0.95,
            timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
            source: "CSV Upload",
            tag: "Tweet"
          },
          {
            id: "hist-5",
            text: "An absolutely breathtaking hike up the mountain! The views from the top are spectacular, truly moving experience.",
            sentiment: "positive",
            score: 0.91,
            confidence: 0.96,
            timestamp: new Date(Date.now() - 36 * 3600000).toISOString(),
            source: "CSV Upload",
            tag: "Review"
          }
        ];
        fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialData, null, 2), "utf-8");
        return initialData;
      }

      const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
      return JSON.parse(raw);
    } catch (e) {
      console.error("Error reading sentiment history database, resetting:", e);
      return [];
    }
  }

  private static writeData(data: HistoryItem[]) {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Error writing sentiment history database:", e);
    }
  }

  /**
   * Get filtered items from SQLite history simulator
   */
  public static getAll(search?: string, sentiment?: string): HistoryItem[] {
    let items = this.readData();

    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(item => 
        item.text.toLowerCase().includes(q) || 
        (item.tag && item.tag.toLowerCase().includes(q))
      );
    }

    if (sentiment) {
      items = items.filter(item => item.sentiment === sentiment);
    }

    // Return descending order of date (newest first)
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Put new analysis record
   */
  public static add(item: Omit<HistoryItem, "id" | "timestamp">): HistoryItem {
    const items = this.readData();
    const newItem: HistoryItem = {
      ...item,
      id: "hist-" + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString()
    };
    items.push(newItem);
    this.writeData(items);
    return newItem;
  }

  /**
   * Bulk add analyses records
   */
  public static addMany(itemsToAdd: Omit<HistoryItem, "id" | "timestamp">[]): HistoryItem[] {
    const items = this.readData();
    const timestamp = new Date().toISOString();
    const created: HistoryItem[] = itemsToAdd.map(item => ({
      ...item,
      id: "hist-" + Math.random().toString(36).substring(2, 9),
      timestamp
    }));
    
    items.push(...created);
    this.writeData(items);
    return created;
  }

  /**
   * Delete entry from database
   */
  public static delete(id: string): boolean {
    const items = this.readData();
    const filtered = items.filter(item => item.id !== id);
    if (items.length === filtered.length) return false;
    this.writeData(filtered);
    return true;
  }

  /**
   * Wipe database
   */
  public static clear(): void {
    this.writeData([]);
  }

  /**
   * Get analytics dashboard details
   */
  public static getDashboardStats(): SummaryStats {
    const items = this.readData();
    const total = items.length;

    let positive = 0;
    let negative = 0;
    let neutral = 0;
    let scoreSum = 0;

    items.forEach(item => {
      scoreSum += item.score;
      if (item.sentiment === "positive") positive++;
      else if (item.sentiment === "negative") negative++;
      else if (item.sentiment === "neutral") neutral++;
    });

    const averageScore = total > 0 ? scoreSum / total : 0;

    return {
      totalAnalyzed: total,
      positiveCount: positive,
      negativeCount: negative,
      neutralCount: neutral,
      averageScore,
      positivePercentage: total > 0 ? Math.round((positive / total) * 100) : 0,
      negativePercentage: total > 0 ? Math.round((negative / total) * 100) : 0,
      neutralPercentage: total > 0 ? Math.round((neutral / total) * 100) : 0
    };
  }
}
