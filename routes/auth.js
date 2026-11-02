const { Router } = require("express");
const { join } = require("path");
const { v4: uuid } = require("uuid");
const dbM = require("../database");
const db = () => dbM.getDb();
const { isRegistrationEnabled } = require("./settings");

const router = Router();
const VIEWS = join(__dirname, "..", "views");

router.get("/register", (req, res) => {
  const { player_id } = req.cookies;
  if (player_id && db().prepare("SELECT id FROM players WHERE id = ?").get(player_id)) {
    return res.redirect(req.query.returnTo || "/leaderboard");
  }
  if (!isRegistrationEnabled()) {
    return res.sendFile("register-off.html", { root: VIEWS });
  }
  res.sendFile("register.html", { root: VIEWS });
});

router.post("/register", (req, res) => {
  if (!isRegistrationEnabled()) {
    return res.status(403).json({ error: "Rejestracja jest chwilowo wyłączona." });
  }

  const nick = req.body.nick?.trim();
  if (!nick) return res.status(400).json({ error: "Wypełnij wszystkie pola." });
  if (nick.length < 2 || nick.length > 20) {
    return res.status(400).json({ error: "Nick musi mieć od 2 do 20 znaków." });
  }
  if (db().prepare("SELECT id FROM players WHERE LOWER(nick) = LOWER(?)").get(nick)) {
    return res.status(409).json({ error: "Ten nick jest już zajęty." });
  }

  const id = uuid();
  db().prepare("INSERT INTO players (id, nick) VALUES (?, ?)").run(id, nick);

  res.cookie("player_id", id, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 30 });
  res.json({ success: true, redirectTo: req.body.returnTo || "/" });
});

router.get("/api/me", (req, res) => {
  const { player_id } = req.cookies;
  const player = player_id && db().prepare("SELECT id, nick FROM players WHERE id = ?").get(player_id);
  res.json({ loggedIn: !!player, nick: player?.nick || null });
});

module.exports = router;