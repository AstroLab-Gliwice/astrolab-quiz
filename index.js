const express = require("express");
const cookieParser = require("cookie-parser");
const { join } = require("path");
const db = require("./database");
const { isRegistrationEnabled } = require("./routes/settings");

require("dotenv").config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Wyłącz cache dla wszystkich dynamicznych tras
app.use((req, res, next) => {
  if (!req.path.match(/\.(css|js|svg|png|ico|woff2?)$/)) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
  }
  next();
});

app.get("/leaderboard.html", (_req, res) => res.redirect("/leaderboard"));
app.get("/admin.html", (_req, res) => res.redirect("/admin"));

app.get("/register.html", (req, res) => {
  const { player_id } = req.cookies;
  if (player_id && db.prepare("SELECT id FROM players WHERE id = ?").get(player_id)) {
    return res.redirect("/leaderboard");
  }
  if (!isRegistrationEnabled()) {
    return res.sendFile("register-off.html", { root: "./public" });
  }
  res.redirect("/register");
});

app.use(express.static(join(__dirname, "public")));

app.use(require("./routes/auth"));
app.use(require("./routes/quiz"));
app.use(require("./routes/admin"));
app.use(require("./routes/leaderboard"));

app.get("/", (_req, res) => res.redirect("/index.html"));

app.use((req, res) => {
  if (req.headers.accept?.includes("application/json")) {
    return res.status(404).json({ error: "Nie znaleziono." });
  }
  res.status(404).sendFile("404.html", { root: "./public" });
});

app.listen(PORT, () => {
  console.log("✅ astrolab-quiz - Aplikacja została uruchomiona!");
  console.log(`🌐 Serwer został uruchomiony na porcie ${PORT}`);
});