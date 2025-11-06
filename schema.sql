-- users & mapping to Splynx admin
job_id TEXT,
customer_id INTEGER,
photo_url TEXT
);


CREATE TABLE IF NOT EXISTS assignments(
id INTEGER PRIMARY KEY AUTOINCREMENT,
assignee_user INTEGER,
product_id INTEGER,
qty REAL,
serial_id INTEGER,
status TEXT,
created_at INTEGER,
updated_at INTEGER,
job_id TEXT,
customer_id INTEGER
);


-- tasks & time
CREATE TABLE IF NOT EXISTS tasks(
id INTEGER PRIMARY KEY AUTOINCREMENT,
title TEXT,
description TEXT,
source TEXT,
source_id TEXT,
customer_id INTEGER,
priority TEXT,
status TEXT,
assigned_to INTEGER,
created_by INTEGER,
planned_start INTEGER,
planned_end INTEGER,
created_at INTEGER,
updated_at INTEGER
);


CREATE TABLE IF NOT EXISTS time_entries(
id INTEGER PRIMARY KEY AUTOINCREMENT,
task_id INTEGER,
user_id INTEGER,
started_at INTEGER,
stopped_at INTEGER,
duration_sec INTEGER,
note TEXT,
geo_lat REAL,
geo_lng REAL,
photo_url TEXT,
synced INTEGER DEFAULT 0
);


-- cached customers (optional)
CREATE TABLE IF NOT EXISTS customers(
id INTEGER PRIMARY KEY AUTOINCREMENT,
splynx_customer_id INTEGER UNIQUE,
name TEXT,
phone TEXT,
email TEXT,
city TEXT,
street TEXT,
zip TEXT,
updated_at INTEGER
);


CREATE TABLE IF NOT EXISTS audit_logs(
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
action TEXT,
entity TEXT,
entity_id TEXT,
payload TEXT,
at_ts INTEGER
);
