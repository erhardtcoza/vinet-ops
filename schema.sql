CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'agent', -- admin, agent
  wa_number TEXT,
  splynx_admin_id INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS tariffs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  price REAL,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS signup_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  phone TEXT,
  email TEXT,
  street TEXT,
  city TEXT,
  zip TEXT,
  comment TEXT,
  tariffs TEXT,
  splynx_lead_id INTEGER,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS stock_moves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER,
  barcode TEXT,
  photo_url TEXT,
  note TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS time_pings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  lat REAL,
  lng REAL,
  status TEXT,
  task TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  event TEXT,
  meta TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',          -- open|in_progress|done|cancelled
  priority TEXT DEFAULT 'normal',      -- low|normal|high
  assigned_user_id INTEGER,
  created_by_user_id INTEGER,
  splynx_task_id INTEGER,
  customer_id INTEGER,
  due_at INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);
