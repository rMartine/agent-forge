CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('error-pattern', 'anti-pattern', 'lesson-learned', 'best-practice')),
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  root_cause TEXT,
  affected_domains TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  prevention TEXT,
  detection TEXT,
  examples JSONB DEFAULT '[]',
  created TIMESTAMPTZ DEFAULT now(),
  updated TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_entries_type ON entries(type);
CREATE INDEX idx_entries_severity ON entries(severity);
CREATE INDEX idx_entries_domains ON entries USING GIN(affected_domains);
CREATE INDEX idx_entries_tags ON entries USING GIN(tags);
CREATE INDEX idx_entries_fts ON entries USING GIN(to_tsvector('english', title || ' ' || description));
