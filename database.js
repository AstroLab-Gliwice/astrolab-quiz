const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");

fs.mkdirSync("./data", { recursive: true });

const db = new DatabaseSync("./data/baza.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id         TEXT PRIMARY KEY,
    nick       TEXT NOT NULL UNIQUE,
    score      INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS questions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    code          TEXT NOT NULL UNIQUE,
    question_text TEXT NOT NULL,
    answer        TEXT NOT NULL,
    options       TEXT NOT NULL,
    points        INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS answers (
    player_id   TEXT,
    question_id INTEGER,
    correct     INTEGER,
    PRIMARY KEY (player_id, question_id)
  );

  CREATE TABLE IF NOT EXISTS question_starts (
    player_id   TEXT NOT NULL,
    question_id INTEGER NOT NULL,
    started_at  INTEGER NOT NULL,
    PRIMARY KEY (player_id, question_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('leaderboard_enabled', '1');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('registration_enabled', '1');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('quiz_timelimit', '60');
`);

module.exports = db;