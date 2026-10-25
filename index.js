const express = require("express");
const cookieParser = require("cookie-parser");
const { join } = require("path");

require("dotenv").config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 3000;
const VIEWS = join(__dirname, "views");

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

app.use(express.static(join(__dirname, "public"), { index: false }));

app.use(require("./routes/auth"));
app.use(require("./routes/quiz"));
app.use(require("./routes/admin"));
app.use(require("./routes/leaderboard"));

app.get("/", (_req, res) => res.sendFile("index.html", { root: VIEWS }));
app.get("/answer", (_req, res) => res.sendFile("answer.html", { root: VIEWS }));

app.use((req, res) => {
  if (req.headers.accept?.includes("application/json")) {
    return res.status(404).json({ error: "Nie znaleziono." });
  }
  res.status(404).sendFile("404.html", { root: VIEWS });
});

app.listen(PORT, () => {
  console.log("✅ astrolab-quiz - Aplikacja została uruchomiona!");
  console.log(`🌐 Serwer został uruchomiony na porcie ${PORT}`);
});