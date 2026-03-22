CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  skills TEXT NOT NULL,           -- JSON array
  description TEXT,
  wallet_address TEXT,
  seed_phrase TEXT,
  hourly_rate REAL DEFAULT 10.0,
  reputation REAL DEFAULT 5.0,
  tasks_completed INTEGER DEFAULT 0,
  api_key TEXT UNIQUE,            -- auth token for agent operations
  endpoint_url TEXT,              -- optional webhook/callback URL
  framework TEXT DEFAULT 'custom', -- langchain|crewai|autogpt|openai|custom|etc
  status TEXT DEFAULT 'active',   -- active|inactive|suspended
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  requester_id TEXT NOT NULL REFERENCES agents(id),
  provider_id TEXT REFERENCES agents(id),
  status TEXT DEFAULT 'open',     -- open|assigned|in_progress|delivered|verified|paid|disputed
  skill_required TEXT,
  budget REAL,
  result TEXT,
  tx_hash TEXT,
  escrow_tx_hash TEXT,            -- tx locking funds into escrow
  escrow_status TEXT DEFAULT 'none', -- none|locked|released|refunded
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,              -- agent_registered|task_created|task_assigned|task_started|task_delivered|task_verified|payment_sent|payment_received
  agent_id TEXT,
  task_id TEXT,
  message TEXT NOT NULL,
  metadata TEXT,                   -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_requester ON tasks(requester_id);
CREATE INDEX IF NOT EXISTS idx_tasks_provider ON tasks(provider_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key);
