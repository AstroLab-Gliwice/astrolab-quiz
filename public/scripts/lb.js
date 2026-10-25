const MEDALS = ["🥇", "🥈", "🥉"];

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function load() {
  document.getElementById("tableArea").innerHTML = '<p class="loading">⏳ Ładowanie...</p>';

  try {
    const res = await fetch("/api/leaderboard");
    const all = await res.json();
    const players = all.slice(0, 15);
    const count = all.length;

    document.getElementById("subtitle").textContent =
      count === 1 ? "Udział wziął 1 uczestnik" : `Łącznie udział wzięło ${count} uczestników`;

    if (!players.length) {
      document.getElementById("podium").style.display = "none";
      document.getElementById("tableArea").innerHTML =
        '<div class="table-card"><p class="empty">Brak wyników.<br>Znajdź kody QR i bądź pierwszy! 🎯</p></div>';
      return;
    }

    const podiumEl = document.getElementById("podium");
    if (players.length > 1) {
      podiumEl.style.display = "flex";
      podiumEl.innerHTML = players.slice(0, 3).map((p, i) => `
            <div class="podium-item">
              <div class="podium-medal">${MEDALS[i]}</div>
              <div class="podium-nick">${esc(p.nick)}</div>
              <div class="podium-score">${p.score} pkt</div>
            </div>`).join("");
    } else {
      podiumEl.style.display = "none";
    }

    document.getElementById("tableArea").innerHTML = `
          <div class="table-card">
            <div class="table-header">
              <span>#</span><span>Nick</span><span style="text-align:right">Punkty</span>
            </div>
            ${players.map((p, i) => `
              <div class="table-row">
                <span class="rank">${i + 1}</span>
                <span class="nick">${esc(p.nick)}</span>
                <span class="score">${p.score} pkt</span>
              </div>`).join("")}
          </div>`;

  } catch {
    document.getElementById("tableArea").innerHTML =
      '<div class="table-card"><p class="empty">Błąd ładowania rankingu.</p></div>';
  }
}

document.getElementById("refreshBtn").addEventListener("click", load);
load();
setInterval(load, 30_000);