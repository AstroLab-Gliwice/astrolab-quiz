const questionId = location.pathname.split("/").filter(Boolean).pop();
    const mainEl     = document.getElementById("mainContent");
    const LETTERS    = ["A", "B", "C", "D", "E", "F"];

    function esc(str) {
      return String(str)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    // ── Load ──────────────────────────────────────────────────
    async function loadQuestion() {
      mainEl.innerHTML = `<p style="color:var(--muted);padding:2rem;text-align:center">⏳ Ładowanie...</p>`;

      try {
        const res  = await fetch(`/quiz/api/${questionId}`, { headers: { Accept: "application/json" } });
        const serverDate = res.headers.get("Date");
        const clockOffset = serverDate ? Date.now() - new Date(serverDate).getTime() : 0;
        const data = await res.json();

        if (res.status === 401) {
          location.replace(`/register?returnTo=${encodeURIComponent(location.pathname)}`);
          return;
        }
        if (!res.ok) {
          mainEl.innerHTML = `<p style="color:var(--muted);padding:2rem;text-align:center">Błąd: ${data.error}</p>`;
          return;
        }
        if (data.alreadyAnswered) {
          renderAlreadyAnswered();
          return;
        }

        if (data.startedAt) {
          const elapsed = (Date.now() - clockOffset - data.startedAt) / 1000;
          if (elapsed >= data.timelimit) {
            submitAnswer("__TIMEOUT__");
          } else {
            renderQuestion({ question: data.question, player: data.player, timelimit: data.timelimit, difficulty: data.question.difficulty, file: data.question.file, startedAt: data.startedAt, clockOffset });
          }
        } else {
          renderStart({ ...data, clockOffset });
        }
      } catch {
        mainEl.innerHTML = `<p style="color:var(--muted);padding:2rem;text-align:center">Błąd połączenia z serwerem.</p>`;
      }
    }

    // ── Start screen ──────────────────────────────────────────
    function renderStart({ question, player, timelimit, clockOffset = 0 }) {
      mainEl.innerHTML = `
        <div class="panel start-card">
          <div class="question-badge">Pytanie</div>
          <div class="big-number">#${question.id}</div>
          <p class="start-label">👤 <strong>${esc(player.nick)}</strong></p>
          <div style="background:#eef4f9;border-radius:12px;padding:12px 18px;display:flex;align-items:center;gap:10px;font-size:14px;color:var(--accent);font-weight:600;">
            <span style="font-size:22px">⏱️</span>
            <span>Na odpowiedź masz <strong>${timelimit} sekund</strong></span>
          </div>
          <button class="btn" id="startBtn">Rozpocznij ▶</button>
        </div>`;

      document.getElementById("startBtn").addEventListener("click", async () => {
        const btn = document.getElementById("startBtn");
        btn.disabled = true;
        btn.textContent = "⏳ Startuję...";

        try {
          const res  = await fetch(`/quiz/${questionId}/start`, { method: "POST" });
          const data = await res.json();
          const startServerDate = res.headers.get("Date");
          const startClockOffset = startServerDate ? Date.now() - new Date(startServerDate).getTime() : clockOffset;

          if (res.status === 409) { location.reload(); return; }
          if (!res.ok) { btn.disabled = false; btn.textContent = "Rozpocznij ▶"; return; }

          renderQuestion({ question, player, timelimit, difficulty: question.difficulty, file: question.file, startedAt: data.startedAt, clockOffset: startClockOffset });
        } catch {
          btn.disabled = false;
          btn.textContent = "Rozpocznij ▶";
          alert("Błąd połączenia. Spróbuj ponownie.");
        }
      });
    }

    // ── Question screen ───────────────────────────────────────
    function renderQuestion({ question, player, timelimit, difficulty, file, startedAt, clockOffset = 0 }) {
        let diffText = "";
        let type = "";
        switch (difficulty) {
            case ("easy"): diffText = "Łatwy"; break;
            case ("medi"): diffText = "Normalny"; break;
            case ("hard"): diffText = "Wymagający"; break;
        }
        const extension = file.split(".").pop().toLowerCase();
        if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
            type = `<img class="fit" draggable="false" src="${file}" />`;
        }
        else if (["mp4", "webm", "mov", "mkv", "avi"].includes(extension)) {
            type = `<video class="fit" controls src="${file}" controlsList="nodownload"></video>`;
        }
        else if (["mp3", "wav", "ogg", "m4a", "flac"].includes(extension)) {
            type = `<audio class="fit" controls src="${file}" controlsList="nodownload"></audio>`;
        }
        else {
            type= `<div style="display='none'"/>`;
        }
      mainEl.innerHTML = `
        <div class="panel quiz-card">
          <div class="player-bar">👤 <span class="nick">${esc(player.nick)}</span></div>
          <div class="column">
            <div class="question-meta">
              <span class="question-number">Pytanie #${question.id}</span>
            </div>
            <div class="row">
                 <div class="question-text">${esc(question.text)}</div>
                <div class="difficulty-wrap ${difficulty}"><span>${diffText}</span></div>
            </div>
            ${type}
          </div>
          <div class="timer-wrap">
            <div class="timer-bar-track">
              <div class="timer-bar-fill" id="timerFill" style="width:100%"></div>
            </div>
            <div class="timer-label" id="timerLabel">${timelimit}s</div>
          </div>
          <div class="divider"></div>
          <div class="answers" id="answers">
            ${question.options.map((opt, i) =>
              `<div class="answer" data-letter="${LETTERS[i] || i + 1}">${esc(opt)}</div>`
            ).join("")}
          </div>
          <button class="submit-btn" id="submitBtn" disabled>Zatwierdź odpowiedź</button>
        </div>`;

      let selectedAnswer = null;
      const answersEl = document.getElementById("answers");
      const submitBtn = document.getElementById("submitBtn");
      const timerFill = document.getElementById("timerFill");
      const timerLabel = document.getElementById("timerLabel");

      answersEl.addEventListener("click", (e) => {
        const el = e.target.closest(".answer");
        if (!el || el.classList.contains("disabled")) return;
        answersEl.querySelectorAll(".answer").forEach((a) => a.classList.remove("selected"));
        el.classList.add("selected");
        selectedAnswer = el.textContent.trim();
        submitBtn.classList.add("active");
        submitBtn.disabled = false;
      });

      submitBtn.addEventListener("click", () => {
        if (selectedAnswer) submitAnswer(selectedAnswer);
      });

      // ── Timer (rAF — smooth, server-based) ───────────────────
      let timerExpired = false;
      let lastDisplayedSecond = null;

      function timerTick() {
        const elapsed   = (Date.now() - clockOffset - startedAt) / 1000;
        const remaining = Math.max(0, timelimit - elapsed);
        const pct       = (remaining / timelimit) * 100;

        timerFill.style.width = pct + "%";

        const displaySec = Math.ceil(remaining);
        if (displaySec !== lastDisplayedSecond) {
          lastDisplayedSecond = displaySec;
          timerLabel.textContent = displaySec + "s";
        }

        const warning = remaining <= timelimit * 0.4;
        const danger  = remaining <= timelimit * 0.2;
        timerFill.classList.toggle("warning", warning && !danger);
        timerFill.classList.toggle("danger",  danger);
        timerLabel.classList.toggle("warning", warning && !danger);
        timerLabel.classList.toggle("danger",  danger);

        if (remaining <= 0) {
          timerFill.style.width = "0%";
          timerLabel.textContent = "0s";
          if (!timerExpired) {
            timerExpired = true;
            answersEl.querySelectorAll(".answer").forEach((a) => a.classList.add("disabled"));
            submitBtn.disabled = true;
            submitBtn.classList.remove("active");
            submitBtn.textContent = "⏰ Zapisywanie...";
            submitAnswer("__TIMEOUT__");
          }
          return;
        }

        requestAnimationFrame(timerTick);
      }

      requestAnimationFrame(timerTick);
    }

    // ── Submit ────────────────────────────────────────────────
    async function submitAnswer(answer) {
      const isTimeout = answer === "__TIMEOUT__";
      const submitBtn = document.getElementById("submitBtn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = isTimeout ? "⏰ Zapisywanie..." : "Sprawdzam...";
      }

      try {
        const res  = await fetch(`/quiz/${questionId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer }),
        });
        const data = await res.json();

        if (res.status === 409) { location.replace("/answer.html?alreadyAnswered=1"); return; }

        document.querySelectorAll(".answer").forEach((el) => el.classList.add("disabled"));
        if (submitBtn) submitBtn.classList.remove("active");

        const wasTimeout = isTimeout || data.timedOut;
        if (submitBtn) submitBtn.textContent = wasTimeout ? "⏰ Czas minął!" : "Wysyłanie...";
        setTimeout(() => location.replace(wasTimeout ? "/answer.html?timeout=1" : "/answer.html"), 600);
      } catch {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = isTimeout ? "⏰ Czas minął!" : "Zatwierdź odpowiedź";
          if (!isTimeout) {
            submitBtn.classList.add("active");
            alert("Błąd połączenia. Spróbuj ponownie.");
          }
        }
      }
    }

    // ── Already answered ──────────────────────────────────────
    function renderAlreadyAnswered() {
      mainEl.innerHTML = `
        <div class="info-card">
          <div class="big-icon">⚠️</div>
          <h1>Już tu byłeś!</h1>
          <p>Już próbowałeś odpowiedzieć na to pytanie.</p>
          <p style="margin-top:-10px">Skanuj kolejne kody QR!</p>
          <a href="/" class="btn">← Wróć na stronę główną</a>
        </div>`;
    }

    loadQuestion();