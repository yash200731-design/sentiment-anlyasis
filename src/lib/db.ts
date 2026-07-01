/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from "@supabase/supabase-js";
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

const supabaseUrl = process.env.SUPABASE_URL || "https://zruedfjmyqsziydqvajb.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";

const isSupabaseEnabled = (): boolean => {
  return !!(supabaseKey && supabaseKey !== "YOUR_SUPABASE_ANON_KEY" && supabaseKey !== "");
};

let supabaseClient: any = null;
if (isSupabaseEnabled()) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized successfully.");
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
  }
} else {
  console.log("Supabase not configured. Using local JSON database fallback.");
}

export class SentimentHistoryDB {
  private static readLocalData(): HistoryItem[] {
    try {
      if (!fs.existsSync(DB_FILE_PATH)) {
        // Feed initial dummy data so the user sees a beautiful pre-populated history on first load!
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
      console.error("Error reading local sentiment history database, resetting:", e);
      return [];
    }
  }

  private static writeLocalData(data: HistoryItem[]) {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Error writing local sentiment history database:", e);
    }
  }

  /**
   * Get filtered items from Supabase or local history simulator
   */
  public static async getAll(search?: string, sentiment?: string): Promise<HistoryItem[]> {
    if (isSupabaseEnabled() && supabaseClient) {
      try {
        let query = supabaseClient.from("sentiment_history").select("*");
        if (sentiment) {
          query = query.eq("sentiment", sentiment);
        }
        if (search) {
          query = query.or(`text.ilike.%${search}%,tag.ilike.%${search}%`);
        }
        const { data, error } = await query.order("timestamp", { ascending: false });
        if (error) throw error;
        return (data || []) as HistoryItem[];
      } catch (e) {
        console.error("Supabase getAll error, falling back to local database:", e);
      }
    }

    let items = this.readLocalData();

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
  public static async add(item: Omit<HistoryItem, "id" | "timestamp">): Promise<HistoryItem> {
    const newItem: HistoryItem = {
      ...item,
      id: "hist-" + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString()
    };

    if (isSupabaseEnabled() && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from("sentiment_history")
          .insert([newItem])
          .select();
        if (error) throw error;
        if (data && data[0]) return data[0] as HistoryItem;
      } catch (e) {
        console.error("Supabase add error, falling back to local database:", e);
      }
    }

    const items = this.readLocalData();
    items.push(newItem);
    this.writeLocalData(items);
    return newItem;
  }

  /**
   * Bulk add analyses records
   */
  public static async addMany(itemsToAdd: Omit<HistoryItem, "id" | "timestamp">[]): Promise<HistoryItem[]> {
    const timestamp = new Date().toISOString();
    const created: HistoryItem[] = itemsToAdd.map(item => ({
      ...item,
      id: "hist-" + Math.random().toString(36).substring(2, 9),
      timestamp
    }));

    if (isSupabaseEnabled() && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from("sentiment_history")
          .insert(created)
          .select();
        if (error) throw error;
        if (data && data.length > 0) return data as HistoryItem[];
      } catch (e) {
        console.error("Supabase addMany error, falling back to local database:", e);
      }
    }

    const items = this.readLocalData();
    items.push(...created);
    this.writeLocalData(items);
    return created;
  }

  /**
   * Delete entry from database
   */
  public static async delete(id: string): Promise<boolean> {
    if (isSupabaseEnabled() && supabaseClient) {
      try {
        const { error, data } = await supabaseClient
          .from("sentiment_history")
          .delete()
          .eq("id", id)
          .select();
        if (error) throw error;
        return !!(data && data.length > 0);
      } catch (e) {
        console.error("Supabase delete error, falling back to local database:", e);
      }
    }

    const items = this.readLocalData();
    const filtered = items.filter(item => item.id !== id);
    if (items.length === filtered.length) return false;
    this.writeLocalData(filtered);
    return true;
  }

  /**
   * Wipe database
   */
  public static async clear(): Promise<void> {
    if (isSupabaseEnabled() && supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from("sentiment_history")
          .delete()
          .neq("id", "does_not_exist_sentinel"); // Delete all records
        if (error) throw error;
        return;
      } catch (e) {
        console.error("Supabase clear error, falling back to local database:", e);
      }
    }

    this.writeLocalData([]);
  }

  /**
   * Get analytics dashboard details
   */
  public static async getDashboardStats(): Promise<SummaryStats> {
    let items: HistoryItem[] = [];

    if (isSupabaseEnabled() && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from("sentiment_history")
          .select("*");
        if (error) throw error;
        items = (data || []) as HistoryItem[];
      } catch (e) {
        console.error("Supabase getDashboardStats error, falling back to local database:", e);
        items = this.readLocalData();
      }
    } else {
      items = this.readLocalData();
    }

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
