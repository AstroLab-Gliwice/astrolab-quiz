const db = require("../database");

const getSetting = (key) =>
  db.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value;

const setSetting = (key, val) =>
  db.prepare("UPDATE settings SET value = ? WHERE key = ?").run(val, key);

// ── Leaderboard ───────────────────────────────────────────────
const isLeaderboardEnabled = () => getSetting("leaderboard_enabled") === "1";
const setLeaderboardEnabled = (val) => setSetting("leaderboard_enabled", val ? "1" : "0");

// ── Registration ──────────────────────────────────────────────
const isRegistrationEnabled = () => getSetting("registration_enabled") === "1";
const setRegistrationEnabled = (val) => setSetting("registration_enabled", val ? "1" : "0");

// ── Quiz timelimit ────────────────────────────────────────────
const getTimelimit = () => {
  const val = parseInt(getSetting("quiz_timelimit"));
  return isNaN(val) ? 60 : val;
};

const setTimelimit = (v) => {
  const val = Math.max(5, Math.min(600, parseInt(v) || 60));
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('quiz_timelimit', ?)").run(String(val));
  return val;
};

module.exports = {
  isLeaderboardEnabled,
  setLeaderboardEnabled,
  isRegistrationEnabled,
  setRegistrationEnabled,
  getTimelimit,
  setTimelimit,
};