-- Run this script in your Supabase SQL Editor to initialize the database table!

CREATE TABLE IF NOT EXISTS sentiment_history (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  sentiment TEXT NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  confidence DOUBLE PRECISION NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  source TEXT NOT NULL,
  tag TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE sentiment_history ENABLE ROW LEVEL SECURITY;

-- Allow public read and write access for convenience in this showcase applet
CREATE POLICY "Allow public read and write" ON sentiment_history
  FOR ALL USING (true) WITH CHECK (true);
