const { Router } = require("express");
const { randomBytes } = require("crypto");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const db = require("../database");
const {
  isLeaderboardEnabled, setLeaderboardEnabled,
  isRegistrationEnabled, setRegistrationEnabled,
  getTimelimit, setTimelimit,
} = require("./settings");

const router = Router();

const ADMIN_COOKIE = "admin_session";
const SESSION_TOKEN = randomBytes(32).toString("hex");

// ── Password setup ────────────────────────────────────────────
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "$2b$12$5GlksYeiyWu2xCyRq0acGef7vy0SL0yE4/OwFUd2u1rAVyIAk2ZWS";

// ── Rate limiter ──────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut." },
});

// ── Middleware ────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.cookies[ADMIN_COOKIE] === SESSION_TOKEN) return next();
  if (req.headers.accept?.includes("application/json")) {
    return res.status(401).json({ error: "Nieautoryzowany dostęp." });
  }
  res.redirect("/admin/login");
}

function validateQuestion({ question_text, answer, options }) {
  if (!question_text?.trim() || !answer?.trim() || !Array.isArray(options) || options.length < 2) {
    return "Wypełnij wszystkie wymagane pola.";
  }
  if (!options.map((o) => o.trim().toLowerCase()).includes(answer.trim().toLowerCase())) {
    return "Odpowiedź musi być jedną z opcji.";
  }
  return null;
}

const parseQuestion = (q) => ({ ...q, options: JSON.parse(q.options) });

// ── Auth ──────────────────────────────────────────────────────
router.get("/admin/login", (req, res) => {
  if (req.cookies[ADMIN_COOKIE] === SESSION_TOKEN) return res.redirect("/admin");
  res.sendFile("admin-login.html", { root: "./public" });
});

router.post("/admin/login", loginLimiter, async (req, res) => {
  const { password } = req.body;

  const valid = password && await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!valid) {
    return res.status(401).json({ error: "Nieprawidłowe hasło." });
  }

  res.cookie(ADMIN_COOKIE, SESSION_TOKEN, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 8,
  });
  res.json({ success: true });
});

router.post("/admin/logout", (_req, res) => {
  res.clearCookie(ADMIN_COOKIE);
  res.json({ success: true });
});

router.get("/admin", requireAdmin, (_req, res) => {
  res.sendFile("admin.html", { root: "./public" });
});

// ── Stats ─────────────────────────────────────────────────────
router.get("/admin/api/stats", requireAdmin, (_req, res) => {
  res.json({
    players:   db.prepare("SELECT COUNT(*) AS c FROM players").get().c,
    questions: db.prepare("SELECT COUNT(*) AS c FROM questions").get().c,
    answers:   db.prepare("SELECT COUNT(*) AS c FROM answers").get().c,
    correct:   db.prepare("SELECT COUNT(*) AS c FROM answers WHERE correct = 1").get().c,
  });
});

// ── Questions ─────────────────────────────────────────────────
router.get("/admin/api/questions", requireAdmin, (_req, res) => {
  res.json(db.prepare("SELECT * FROM questions ORDER BY id ASC").all().map(parseQuestion));
});

router.post("/admin/api/questions", requireAdmin, (req, res) => {
  const { question_text, answer, options, points } = req.body;
  const err = validateQuestion({ question_text, answer, options });
  if (err) return res.status(400).json({ error: err });

  const code = randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
  try {
    const info = db
      .prepare("INSERT INTO questions (code, question_text, answer, options, points) VALUES (?, ?, ?, ?, ?)")
      .run(code, question_text.trim(), answer.trim(), JSON.stringify(options.map((o) => o.trim())), points || 1);
    res.json(parseQuestion(db.prepare("SELECT * FROM questions WHERE id = ?").get(info.lastInsertRowid)));
  } catch {
    res.status(500).json({ error: "Błąd bazy danych." });
  }
});

router.put("/admin/api/questions/:id", requireAdmin, (req, res) => {
  const { question_text, answer, options, points } = req.body;
  const { id } = req.params;

  const err = validateQuestion({ question_text, answer, options });
  if (err) return res.status(400).json({ error: err });

  if (!db.prepare("SELECT id FROM questions WHERE id = ?").get(id)) {
    return res.status(404).json({ error: "Nie znaleziono pytania." });
  }

  db.prepare("UPDATE questions SET question_text = ?, answer = ?, options = ?, points = ? WHERE id = ?")
    .run(question_text.trim(), answer.trim(), JSON.stringify(options.map((o) => o.trim())), points || 1, id);

  res.json(parseQuestion(db.prepare("SELECT * FROM questions WHERE id = ?").get(id)));
});

router.delete("/admin/api/questions/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  if (!db.prepare("SELECT id FROM questions WHERE id = ?").get(id)) {
    return res.status(404).json({ error: "Nie znaleziono pytania." });
  }
  db.prepare("DELETE FROM answers WHERE question_id = ?").run(id);
  db.prepare("DELETE FROM questions WHERE id = ?").run(id);
  res.json({ success: true });
});

// ── Players ───────────────────────────────────────────────────
router.get("/admin/api/players", requireAdmin, (_req, res) => {
  res.json(
    db.prepare(`
      SELECT p.id, p.nick, p.score, p.created_at,
        (SELECT COUNT(*) FROM answers a WHERE a.player_id = p.id) AS total_answers,
        (SELECT COUNT(*) FROM answers a WHERE a.player_id = p.id AND a.correct = 1) AS correct_answers
      FROM players p ORDER BY p.score DESC
    `).all()
  );
});

router.delete("/admin/api/players/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  if (!db.prepare("SELECT id FROM players WHERE id = ?").get(id)) {
    return res.status(404).json({ error: "Nie znaleziono gracza." });
  }
  db.prepare("DELETE FROM answers WHERE player_id = ?").run(id);
  db.prepare("DELETE FROM players WHERE id = ?").run(id);
  res.json({ success: true });
});

// ── Settings ──────────────────────────────────────────────────
router.get("/admin/api/settings/leaderboard", requireAdmin, (_req, res) => {
  res.json({ enabled: isLeaderboardEnabled() });
});

router.post("/admin/api/settings/leaderboard", requireAdmin, (req, res) => {
  setLeaderboardEnabled(!!req.body.enabled);
  res.json({ enabled: isLeaderboardEnabled() });
});

router.get("/admin/api/settings/registration", requireAdmin, (_req, res) => {
  res.json({ enabled: isRegistrationEnabled() });
});

router.post("/admin/api/settings/registration", requireAdmin, (req, res) => {
  setRegistrationEnabled(!!req.body.enabled);
  res.json({ enabled: isRegistrationEnabled() });
});

router.get("/admin/api/settings/timelimit", requireAdmin, (_req, res) => {
  res.json({ seconds: getTimelimit() });
});

router.post("/admin/api/settings/timelimit", requireAdmin, (req, res) => {
  res.json({ seconds: setTimelimit(req.body.seconds) });
});

module.exports = router;