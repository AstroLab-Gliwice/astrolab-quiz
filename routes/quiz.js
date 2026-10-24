const { Router } = require("express");
const db = require("../database");
const { getTimelimit } = require("./settings");

const router = Router();

const getPlayer = (req) => {
  const { player_id } = req.cookies;
  if (!player_id) return null;
  return db.prepare("SELECT id, nick, score FROM players WHERE id = ?").get(player_id);
};

const getQuestion = (code) =>
  db.prepare("SELECT id FROM questions WHERE code = ?").get(code);

// ── Pages ─────────────────────────────────────────────────────
router.get("/quiz/:id", (req, res) => {
  const player = getPlayer(req);
  if (!player) {
    return res.redirect("/register?returnTo=" + encodeURIComponent(req.originalUrl));
  }
  if (!getQuestion(req.params.id)) {
    return res.status(404).sendFile("404.html", { root: "./public" });
  }
  res.sendFile("quiz.html", { root: "./public" });
});

// ── API: get question state ───────────────────────────────────
router.get("/quiz/api/:id", (req, res) => {
  const player = getPlayer(req);
  if (!player) return res.status(401).json({ error: "Wymagana rejestracja." });

  const question = db
    .prepare("SELECT id, question_text, options, difficulty, time, file, points FROM questions WHERE code = ?")
    .get(req.params.id);
  if (!question) return res.status(404).json({ error: "Nie ma takiego pytania." });

  const attempt = db
    .prepare("SELECT correct FROM answers WHERE player_id = ? AND question_id = ?")
    .get(player.id, question.id);

  const startRow = db
    .prepare("SELECT started_at FROM question_starts WHERE player_id = ? AND question_id = ?")
    .get(player.id, question.id);

  res.json({
    question: {
      id: question.id,
      text: question.question_text,
      options: JSON.parse(question.options),
      difficulty: question.difficulty,
      time: question.time,
      file: question.file,
      points: question.points,
    },
    player,
    alreadyAnswered: !!attempt,
    wasCorrect: attempt?.correct === 1,
    timelimit: question.time,
    startedAt: startRow?.started_at ?? null,
  });
});

// ── API: register question start ──────────────────────────────
router.post("/quiz/:id/start", (req, res) => {
  const player = getPlayer(req);
  if (!player) return res.status(401).json({ error: "Wymagana rejestracja." });

  const question = getQuestion(req.params.id);
  if (!question) return res.status(404).json({ error: "Nie ma takiego pytania." });

  if (db.prepare("SELECT 1 FROM answers WHERE player_id = ? AND question_id = ?").get(player.id, question.id)) {
    return res.status(409).json({ error: "Już odpowiedziałeś na to pytanie." });
  }

  db.prepare("INSERT OR IGNORE INTO question_starts (player_id, question_id, started_at) VALUES (?, ?, ?)")
    .run(player.id, question.id, Date.now());

  const row = db
    .prepare("SELECT started_at FROM question_starts WHERE player_id = ? AND question_id = ?")
    .get(player.id, question.id);

  res.json({ startedAt: row.started_at });
});

// ── API: submit answer ────────────────────────────────────────
router.post("/quiz/:id/answer", (req, res) => {
  const player = getPlayer(req);
  if (!player) return res.status(401).json({ error: "Wymagana rejestracja." });

  const question = db
    .prepare("SELECT id, answer, difficulty, time, points FROM questions WHERE code = ?")
    .get(req.params.id);
  if (!question) return res.status(404).json({ error: "Nie ma takiego pytania." });

  if (db.prepare("SELECT 1 FROM answers WHERE player_id = ? AND question_id = ?").get(player.id, question.id)) {
    return res.status(409).json({ error: "Już odpowiedziałeś na to pytanie." });
  }

  const startRow = db
    .prepare("SELECT started_at FROM question_starts WHERE player_id = ? AND question_id = ?")
    .get(player.id, question.id);

  const timedOut = !startRow || (Date.now() - startRow.started_at) / 1000 > question.time;
  const correct =
    !timedOut &&
    req.body.answer?.trim().toLowerCase() === question.answer.trim().toLowerCase();

  db.prepare("INSERT INTO answers (player_id, question_id, correct) VALUES (?, ?, ?)")
    .run(player.id, question.id, correct ? 1 : 0);

  if (correct) {
    db.prepare("UPDATE players SET score = score + ? WHERE id = ?").run(question.points, player.id);
  }

  const { score: newScore } = db.prepare("SELECT score FROM players WHERE id = ?").get(player.id);

  res.json({
    correct,
    timedOut,
    points: correct ? question.points : 0,
    newScore,
    correctAnswer: correct ? null : question.answer,
  });
});

module.exports = router;