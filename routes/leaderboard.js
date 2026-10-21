const { Router } = require("express");
const db = require("../database");
const { isLeaderboardEnabled } = require("./settings");

const router = Router();

router.get("/leaderboard", (_req, res) => {
  const file = isLeaderboardEnabled() ? "leaderboard.html" : "leaderboard-off.html";
  res.sendFile(file, { root: "./public" });
});

router.get("/api/leaderboard", (_req, res) => {
  if (!isLeaderboardEnabled()) {
    return res.status(403).json({ error: "Ranking jest chwilowo wyłączony." });
  }
  res.json(db.prepare("SELECT nick, score FROM players ORDER BY score DESC, nick ASC LIMIT 100").all());
});

module.exports = router;