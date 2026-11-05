// ── Helpers ───────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function emptyRow(tbodyId, text) {
  const tbody = document.getElementById(tbodyId);
  const cols = tbody.closest("table").querySelectorAll("thead th").length || 1;
  tbody.innerHTML = `<tr class="empty-row"><td colspan="${cols}">${text}</td></tr>`;
}

function toast(msg, type = "ok") {
  const el = document.getElementById("toast");
  el.innerHTML = (type === "err" ? '<span class="material-symbols-outlined ultra-small">close</span> ' : '<span class="material-symbols-outlined ultra-small">check</span> ') + msg;
  el.className = `toast show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = "toast"; }, 3000);
}

async function api(url, opts = {}) {
  const headers = { Accept: "application/json" };
  if (opts.body) headers["Content-Type"] = "application/json";
  const res = await fetch(url, { credentials: "same-origin", ...opts, headers });
  const data = await res.json();
  return { ok: res.ok, data };
}

// ── Confirm dialog ────────────────────────────────────────
let _confirmResolve = null;

document.getElementById("confirmOk").onclick = () => {
  document.getElementById("confirmOverlay").classList.remove("open");
  _confirmResolve?.(true);
  _confirmResolve = null;
};

document.getElementById("confirmEdit").onclick = () => {
  document.getElementById("editOverlay").classList.remove("open");
  _confirmResolve?.(true);
  _confirmResolve = null;
};

document.getElementById("confirmCancel").onclick = () => {
  document.getElementById("confirmOverlay").classList.remove("open");
  _confirmResolve?.(false);
  _confirmResolve = null;
};

document.getElementById("confirmCancelEdit").onclick = () => {
  document.getElementById("editOverlay").classList.remove("open");
  _confirmResolve?.(false);
  _confirmResolve = null;
};

function openConfirm(title, msg) {
  _confirmResolve?.(false);
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmMsg").textContent = msg;
  document.getElementById("confirmOverlay").classList.add("open");
  return new Promise((r) => { _confirmResolve = r; });
}

function openInput(title, msg) {
  _confirmResolve?.(false);
  document.getElementById("confirmTitle2").textContent = title;
  document.getElementById("confirmMsg2").innerHTML = msg;
  document.getElementById("editOverlay").classList.add("open");
  return new Promise((r) => { _confirmResolve = r; });
}

// ── Navigation ────────────────────────────────────────────
function goTo(page) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  document.getElementById(`page-${page}`).classList.add("active");
  if (page === "dashboard") loadDashboard();
  if (page === "questions") loadQuestions();
  if (page === "players") loadPlayers();
  if (page === "settings") loadSettings();
}

document.querySelectorAll(".nav-btn").forEach((b) => { b.onclick = () => goTo(b.dataset.page); });

document.getElementById("logoutBtn").onclick = async () => {
  await api("/astrolab-admin/logout", { method: "POST" });
  location.replace("/astrolab-admin/login");
};

// ── Dashboard ─────────────────────────────────────────────
async function loadDashboard() {
  emptyRow("topBody", "Ładowanie...");
  try {
    const [{ data: stats }, { data: players }] = await Promise.all([
      api("/astrolab-admin/api/stats"),
      api("/astrolab-admin/api/players"),
    ]);

    document.getElementById("s-q").textContent = stats.questions ?? "—";
    document.getElementById("s-p").textContent = stats.players ?? "—";
    document.getElementById("s-a").textContent = stats.answers ?? "—";
    document.getElementById("s-c").textContent = stats.correct ?? "—";

    const MEDALS = ["🥇", "🥈", "🥉"];
    const top5 = (Array.isArray(players) ? players : []).slice(0, 5);

    if (top5.length) {
      document.getElementById("topBody").innerHTML = top5.map((x, i) =>
        `<tr>
                  <td class="rank-cell">${MEDALS[i] || i + 1}</td>
                  <td class="nick-cell">${esc(x.nick)}</td>
                  <td class="score-cell">${x.score} pkt</td>
                </tr>`).join("");
    } else {
      emptyRow("topBody", "Brak graczy");
    }
  } catch {
    toast("Błąd ładowania dashboardu", "err");
  }
}

// ── Questions ─────────────────────────────────────────────
let questions = [];

async function loadQuestions() {
  emptyRow("qBody", "Ładowanie...");
  try {
    const { data } = await api("/astrolab-admin/api/questions");
    questions = Array.isArray(data) ? data : [];
    renderQuestions();
  } catch {
    toast("Błąd ładowania pytań", "err");
  }
}

function renderQuestions() {
  const tbody = document.getElementById("qBody");

  document.getElementById("qToolbar").classList.add("hidden");
  document.getElementById("check-all-entries").checked = false;

  if (!questions.length) {
    emptyRow("qBody", 'Brak pytań. Kliknij "Nowe pytanie", aby dodać pytanie.');
    return;
  }

  tbody.innerHTML = questions.map((q) => `
          <tr>
            <td class="td-small"><input type="checkbox" name="check-the-entry" class="check-the-entry"></td>
            <td class="td-small" style="color:var(--muted);font-weight:700">${q.id}</td>
            <td><span class="code-badge">${esc(q.code)}</span></td>
            <td>${esc(q.type)}</td>
            <td>
              <span class="url-cell">/quiz/${esc(q.code)}</span>
              <button class="copy-url" onclick="copyUrl('${location.origin}/quiz/${esc(q.code)}')">
                <span class="material-symbols-outlined really-small-icon">
                  content_copy
                </span>
              </button>
            </td>
            <td class="q-text">${esc(q.question_text)}</td>
            <td class="opts-list">${q.options.map((o) => esc(o)).join(" · ")}</td>
            <td class="q-answer">${q.answer.map((o) => esc(o)).join(", ")}</td>
            <td>${q.file ? `<a href="${esc(q.file)}" target="_blank" rel="noopener">Załącznik</a>` : `<span>brak</span>`}</td>
            <td>${esc(q.time)}s</td>
            <td>${esc(q.difficulty)}</td>
            <td><span class="points-badge">${q.points} pkt</span></td>
            <td>
              <div class="actions">
                <button class="btn btn-qr btn-sm" onclick="openQR('${esc(q.code)}')"><span class="material-symbols-outlined">
                  qr_code_scanner
                </span></button>
                <button class="btn btn-edit btn-sm" onclick="openEditQ(${q.id})"><span class="material-symbols-outlined">
                  edit
                </span></button>
                <button class="btn btn-danger btn-sm" onclick="deleteQ(${q.id})"><span class="material-symbols-outlined">
                  delete
                </span></button>
              </div>
            </td>
          </tr>`).join("");
  document.querySelectorAll(".check-the-entry").forEach(el => {
    el.addEventListener("click", () => {
      if (document.querySelectorAll(".check-the-entry:checked").length != 0) {
        if (document.querySelector("#qToolbar").classList.contains("hidden")) document.querySelector("#qToolbar").classList.remove("hidden");
      }
      else {
        if (!document.querySelector("#qToolbar").classList.contains("hidden")) document.querySelector("#qToolbar").classList.add("hidden");
      }
      document.querySelector("#check-all-entries").checked = true;
      document.querySelectorAll(".check-the-entry").forEach(ele => {
        if (!ele.checked) {
            document.querySelector("#check-all-entries").checked = false;
            return;
        } 
      });
    })
  });
}

function copyUrl(url) {
  navigator.clipboard.writeText(url).then(() => toast("URL skopiowany!"));
}

async function deleteQ(id) {
  const q = questions.find((x) => x.id === id);
  if (!q) return;
  if (!await openConfirm("Usuń pytanie", `Usunąć "${q.question_text}"?\nZostaną usunięte też odpowiedzi graczy.`)) return;
  const { ok } = await api(`/astrolab-admin/api/questions/${id}`, { method: "DELETE" });
  ok ? (toast("Pytanie usunięte."), loadQuestions()) : toast("Błąd usuwania.", "err");
}

// ── Question modal ────────────────────────────────────────
let editingQId = null;

function openAddQ() {
  editingQId = null;
  document.getElementById("qModalTitle").textContent = "Nowe pytanie";
  document.querySelector("#fType").value = "one";
  document.querySelector("#fFile").value = "";
  document.getElementById("fText").value = "";
  document.getElementById("fPoints").value = 1;
  document.getElementById("qErr").style.display = "none";
  buildOpts(["", "", "", ""]);
  document.getElementById("qModal").classList.add("open");
}

function openEditQ(id) {
  const q = questions.find((x) => x.id === id);
  if (!q) return;
  editingQId = id;
  document.getElementById("qModalTitle").textContent = `Edytuj pytanie #${id}`;
  document.querySelector("#fType").value = q.type;
  document.getElementById("fText").value = q.question_text;
  document.getElementById("fPoints").value = q.points;
  document.querySelector("#fDiff").value = q.difficulty;
  document.querySelector("#fTime").value = q.time;
  document.getElementById("qErr").style.display = "none";
  buildOpts(q.options);
  setTimeout(() => { 
    buildAnsw(q.answer);  
  }, 0);
  document.getElementById("qModal").classList.add("open");
}

function closeQModal() { document.getElementById("qModal").classList.remove("open"); }

document.getElementById("qModalClose").onclick = closeQModal;
document.getElementById("qModalCancel").onclick = closeQModal;
document.getElementById("addQBtn").onclick = openAddQ;
document.getElementById("addOptBtn").onclick = () => addOpt("");

document.getElementById("saveQBtn").onclick = async () => {
  const type = document.querySelector("#fType").value;
  const text = document.getElementById("fText").value.trim();
  const diff = document.querySelector("#fDiff").value;
  const time = parseInt(document.querySelector("#fTime").value) || 15;
  const options = getOptVals().filter((v) => v.trim());
  const points = parseInt(document.getElementById("fPoints").value) || 1;
  const errEl = document.getElementById("qErr");
  errEl.style.display = "none";
  const answer = [];

  document.querySelectorAll(".gAnswer").forEach(el => { // jest sroda, mam udar
    answer.push(el.value);
  });

  const file = document.querySelector("#fFile").files[0];
  let fileUri = "";

  let checkUp = (!text || !answer || options.length < 2);
  if (checkUp) {
    if (!text) {
      errEl.textContent = "Wypełnij treść, opcje i wybierz poprawną odpowiedź. [Treść pytania]";
    }
    else if (!answer) {
      errEl.textContent = "Wypełnij treść, opcje i wybierz poprawną odpowiedź. [Kontent dostępnych odpowiedzi]";
    }
    else if (options.length < 2) {
      errEl.textContent = "Wypełnij treść, opcje i wybierz poprawną odpowiedź. [Dostępne odpowiedzi < 2]";
    }

    errEl.style.display = "block";
    return;
  }

  const url = editingQId ? `/astrolab-admin/api/questions/${editingQId}` : "/astrolab-admin/api/questions";
  const method = editingQId ? "PUT" : "POST";

  if (file != null) {
    const formData = new FormData();

    formData.append("file", file);

    const fileRes = await fetch("/files", {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      body: formData
    })
    const dat = await fileRes.json();
    fileUri = dat.url;
    console.log(fileUri);
  }

  const { ok, data } = await api(url, { method, body: JSON.stringify({ type, question_text: text, answer, options, diff, time, fileUri, points }) });


  if (!ok) { errEl.textContent = data.error || "Błąd zapisu."; errEl.style.display = "block"; return; }

  closeQModal();
  toast(editingQId ? "Pytanie zaktualizowane!" : "Pytanie dodane!");
  loadQuestions();
};

// ── Options builder ───────────────────────────────────────
const LETTERS = ["A", "B", "C", "D", "E", "F"];

function buildOpts(vals) {
  document.getElementById("optsBuilder").innerHTML = "";
  vals.forEach((v) => addOpt(v));
}

function buildAnsw(vals) {
  document.getElementById("fAnswers").innerHTML = "";
  vals.forEach((v) => addAnsw(v));
}


function addOpt(val) {
  const builder = document.getElementById("optsBuilder");
  if (builder.children.length >= 6) { toast("Maksymalnie 6 opcji", "err"); return; }

  const row = document.createElement("div");
  row.className = "opt-row";

  const inp = Object.assign(document.createElement("input"), { type: "text", value: val || "" });
  inp.oninput = syncAnswerSel;

  const btn = Object.assign(document.createElement("button"), { className: "opt-remove", textContent: "−", type: "button" });
  btn.onclick = () => {
    if (builder.children.length <= 2) { toast("Minimum 2 opcje", "err"); return; }
    row.remove();
    relabelOpts();
    syncAnswerSel();
  };

  row.append(inp, btn);
  builder.appendChild(row);
  relabelOpts();
  syncAnswerSel();
}

function relabelOpts() {
  document.querySelectorAll("#optsBuilder .opt-row input")
    .forEach((inp, i) => { inp.placeholder = `Opcja ${LETTERS[i] || i + 1}`; });
}

function getOptVals() {
  return [...document.querySelectorAll("#optsBuilder .opt-row input")].map((i) => i.value);
}

function syncAnswerSel() {
  const sel = document.querySelectorAll(".gAnswer");
  const prev = sel.value;
  const vals = getOptVals().filter((v) => v.trim());
  sel.forEach(element => {
    element.innerHTML = '<option value="">— Wybierz odpowiedź... —</option>'
    + vals.map((v) => `<option value="${esc(v)}"${v === prev ? " selected" : ""}>${esc(v)}</option>`).join("");
  });
  
}

function addAnsw(val) {
  const answersDiv = document.querySelector("#fAnswers");
  if (answersDiv.querySelectorAll("select.gAnswer").length < 4) {
    const ddd = document.createElement("select");
    const prev = val;
    ddd.classList.add("gAnswer");
    const vals = getOptVals().filter((v) => v.trim());
    ddd.innerHTML = '<option value="">— Wybierz odpowiedź... —</option>'
      + vals.map((v) => `<option value="${esc(v)}"${v === prev ? " selected" : ""}>${esc(v)}</option>`).join("");
    answersDiv.appendChild(ddd);
  }
  if (document.querySelector("#removeAnswer").classList.contains('hidden')) {
    document.querySelector("#removeAnswer").classList.remove('hidden');
  }
}

document.querySelector("#addAnswer").addEventListener('click', () => {
  const answersDiv = document.querySelector("#fAnswers");
  if (answersDiv.querySelectorAll("select.gAnswer").length < 4) {
    const ddd = document.createElement("select");
    const prev = ddd.value;
    ddd.classList.add("gAnswer");
    const vals = getOptVals().filter((v) => v.trim());
    ddd.innerHTML = '<option value="">— Wybierz odpowiedź... —</option>'
      + vals.map((v) => `<option value="${esc(v)}"${v === prev ? " selected" : ""}>${esc(v)}</option>`).join("");
    answersDiv.appendChild(ddd);
  }
  if (document.querySelector("#removeAnswer").classList.contains('hidden')) {
    document.querySelector("#removeAnswer").classList.remove('hidden');
  }
});


document.querySelector("#removeAnswer").addEventListener('click', () => {
  const answersDiv = document.querySelector("#fAnswers");
  if (answersDiv.querySelectorAll("select.gAnswer").length > 1) {
    const answersDiv = document.querySelector("#fAnswers");
    answersDiv.lastChild.remove();
  }
  if (answersDiv.querySelectorAll("select.gAnswer").length == 1) {
    document.querySelector("#removeAnswer").classList.add('hidden');
  }
});

// ── Players ───────────────────────────────────────────────
let players = [];

async function loadPlayers() {
  emptyRow("pBody", "Ładowanie...");
  try {
    const { data } = await api("/astrolab-admin/api/players");
    players = Array.isArray(data) ? data : [];
    renderPlayers(players);
  } catch {
    toast("Błąd ładowania graczy", "err");
  }
}

function renderPlayers(list) {
  const tbody = document.getElementById("pBody");
  if (!list.length) {
    emptyRow("pBody", "Brak graczy");
    return;
  }
  tbody.innerHTML = list.map((p, i) => `
          <tr>
            <td class="rank-cell">${i + 1}</td>
            <td class="nick-cell">${esc(p.nick)}</td>
            <td class="score-cell">${p.score} pkt</td>
            <td style="color:var(--muted)">${p.total_answers}</td>
            <td style="color:var(--green);font-weight:600">${p.correct_answers}</td>
            <td style="color:var(--muted);font-size:12px">${(p.created_at || "").slice(0, 16).replace("T", " ") || "—"}</td>
            <td>
              <button class="btn btn-edit btn-sm" data-id="${esc(p.id)}" data-nick="${esc(p.nick)}" onclick="changeP(this.dataset.id, this.dataset.nick)"><span class="material-symbols-outlined">
                edit
              </span>
              </button>
            <button class="btn btn-danger btn-sm"
              data-id="${esc(p.id)}" data-nick="${esc(p.nick)}"
              onclick="deleteP(this.dataset.id, this.dataset.nick)"><span class="material-symbols-outlined">
                  delete
                </span></button></td>
              
            
          </tr>`).join("");
}

document.getElementById("playerSearch").oninput = function () {
  const q = this.value.toLowerCase();
  renderPlayers(q ? players.filter((p) => p.nick.toLowerCase().includes(q)) : players);
};

async function deleteP(id, nick) {
  if (!await openConfirm("Usuń gracza", `Usunąć gracza "${nick}"?\nZostaną usunięte też jego odpowiedzi.`)) return;
  const { ok } = await api(`/astrolab-admin/api/players/${id}`, { method: "DELETE" });
  ok ? (toast("Gracz usunięty."), loadPlayers()) : toast("Błąd usuwania.", "err");
}

async function changeP(id, nick) {
  if (!await openInput("Zmień nickname gracza", `<p>Zmień nickname gracza "${nick}":</p><div class="field"><input type="input" id="nicknameChange" value="${esc(nick)}"></div>`)) return;
  const nickname = document.querySelector("#nicknameChange").value;
  const { ok, data } = await api(`/astrolab-admin/api/players/${id}`, { method: "PUT", body: JSON.stringify({ nick: nickname }) });
  ok ? (toast("Zmieniono nickname gracza."), loadPlayers()) : toast("Błąd zmiany nickname'u gracza.", "err");
}

// ── Settings ──────────────────────────────────────────────
const TOGGLE_CONFIG = {
  leaderboard: {
    statusId: "leaderboardStatus",
    on: "✅ Ranking jest aktualnie widoczny dla uczestników.",
    off: "🔒 Ranking jest ukryty — uczestnicy widzą stronę zastępczą.",
    toastOn: "Ranking włączony.",
    toastOff: "Ranking wyłączony.",
  },
  registration: {
    statusId: "registrationStatus",
    on: "✅ Rejestracja jest otwarta — nowi uczestnicy mogą dołączyć.",
    off: "🔒 Rejestracja jest zamknięta — nowi uczestnicy widzą stronę zastępczą.",
    toastOn: "Rejestracja otwarta.",
    toastOff: "Rejestracja zamknięta.",
  },
};

function applyToggleStatus(cfg, enabled) {
  document.getElementById(cfg.statusId).textContent = enabled ? cfg.on : cfg.off;
}

document.querySelector("#export-db").addEventListener('click', () => {
  window.location.href = '/astrolab-admin/api/exporting_database';
})

document.querySelector("#import-db").addEventListener('click', async () => {
  const imData = new FormData();
  imData.append("dbFile", document.querySelector('#dbFile').files[0]);

  if (document.querySelector('#dbFile').files[0] == null) {
     toast(`Błąd ładowania bazy danych: nie wybrano pliku`, "err");
     return;
  }

  if (document.querySelector('#dbFile').files[0].name.match(/\.([^.]+)$/)?.[1]?.toLowerCase() != "db") {
    toast(`Błąd ładowania bazy danych: plik nie jest w formacie .db`, "err");
    return;
  }

  try {
    const response = await fetch("/astrolab-admin/api/importing_database", {
      method: 'POST',
      body: imData
    });
    toast(editingQId ? "Importowanie zakończone!" : "Wczytano bazę danych!");
  } catch (error) {
    console.error(error);
    toast(`Błąd ładowania bazy danych: ${error}`, "err");
  }
})

function makeToggleHandler(apiPath, cfg) {
  return async function () {
    try {
      const { data } = await api(apiPath, { method: "POST", body: JSON.stringify({ enabled: this.checked }) });
      this.checked = data.enabled;
      applyToggleStatus(cfg, data.enabled);
      toast(data.enabled ? cfg.toastOn : cfg.toastOff);
    } catch {
      toast("Błąd zapisu ustawień.", "err");
      this.checked = !this.checked;
    }
  };
}

document.getElementById("leaderboardToggle").onchange =
  makeToggleHandler("/astrolab-admin/api/settings/leaderboard", TOGGLE_CONFIG.leaderboard);
document.getElementById("registrationToggle").onchange =
  makeToggleHandler("/astrolab-admin/api/settings/registration", TOGGLE_CONFIG.registration);

/* function updateTimelimitStatus(seconds) {
  const m     = Math.floor(seconds / 60);
  const s     = seconds % 60;
  const label = m > 0 ? `${m} min ${s > 0 ? s + " sek" : ""}`.trim() : `${s} sekund`;
  document.getElementById("timelimitStatus").textContent =
    `⏱️ Aktualny limit: ${label} — uczestnicy będą widzieć progress bar podczas odpowiadania.`;
} */

async function loadSettings() {
  try {
    const [{ data: lb }, { data: reg }] = await Promise.all([
      api("/astrolab-admin/api/settings/leaderboard"),
      api("/astrolab-admin/api/settings/registration"),
      //api("/astrolab-admin/api/settings/timelimit"),
    ]);

    document.getElementById("leaderboardToggle").checked = lb.enabled;
    applyToggleStatus(TOGGLE_CONFIG.leaderboard, lb.enabled);

    document.getElementById("registrationToggle").checked = reg.enabled;
    applyToggleStatus(TOGGLE_CONFIG.registration, reg.enabled);

    //document.getElementById("timelimitInput").value = tl.seconds;
    //updateTimelimitStatus(tl.seconds);
  } catch {
    toast("Błąd ładowania ustawień", "err");
  }
}

/* document.getElementById("saveTimelimitBtn").onclick = async function () {
  const val = parseInt(document.getElementById("timelimitInput").value);
  if (!val || val < 5 || val > 600) { toast("Podaj wartość od 5 do 600 sekund.", "err"); return; }
  try {
    const { ok, data } = await api("/astrolab-admin/api/settings/timelimit", {
      method: "POST",
      body: JSON.stringify({ seconds: val }),
    });
    if (ok) {
      document.getElementById("timelimitInput").value = data.seconds;
      updateTimelimitStatus(data.seconds);
      toast(`Czas ustawiony na ${data.seconds} sek.`);
    } else {
      toast("Błąd zapisu.", "err");
    }
  } catch {
    toast("Błąd zapisu ustawień.", "err"); aj tam gadasz...
  }
}; */

document.querySelector("#db-header").addEventListener('click', () => {
  if (document.querySelector("#db-content").classList.contains("collapsed")) {
    document.querySelector("#db-content").classList.remove("collapsed");
  }
  else {
    document.querySelector("#db-content").classList.add("collapsed");
  }
});

// ── QR Code ───────────────────────────────────────────────
let _currentQrUrl = "";
let _qrParts;
const DIFF_LABELS = { easy: "Łatwy", medi: "Normalny", hard: "Wymagający" };
const QR_LABEL_H = 150;
const QR_LOGO_SCALE = 0.3;

function openQR(code) {
  _currentQrUrl = `${location.origin}/quiz/${code}`;
  const q = questions.find((x) => x.code === code);
  document.getElementById("qrModalTitle").textContent = `Kod QR – ${code}`;
  document.getElementById("qrModalUrl").textContent = _currentQrUrl;
  document.getElementById("qrModal").classList.add("open");
  generateQR(_currentQrUrl, q.id, DIFF_LABELS[q.difficulty]);
}

function closeQRModal() { document.getElementById("qrModal").classList.remove("open"); }

document.getElementById("qrModalClose").onclick = closeQRModal;

function downloadPng(canvas, suffix = "") {
  const link = document.createElement("a");
  link.download = `qr-${_currentQrUrl.split("/").pop()}${suffix}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}


document.getElementById("qrDownloadBtn").onclick = () => downloadPng(document.getElementById("qrCanvas"));

document.getElementById("qrPrintBtn").addEventListener("click", () => {
  window.print();
});

document.getElementById("qrDownloadTransparentBtn").onclick = () => {
  const { src, id, label } = _qrParts;
  const SIZE = src.width;
  const out = document.createElement("canvas");
  out.width = SIZE;
  out.height = SIZE + QR_LABEL_H;
  const ctx = out.getContext("2d");

  ctx.drawImage(src, 0, 0);
  const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i + 3] = 255 - d[i];
    d[i] = d[i + 1] = d[i + 2] = 0;
  }
  ctx.putImageData(imgData, 0, 0);
  drawQrFooter(ctx, SIZE, id, label);
  overlayLogo(ctx, SIZE, () => downloadPng(out, "-transparent"));
};

function generateQR(url, id, label) {
  const RENDER = 800;
  const hidden = document.createElement("div");
  hidden.style.cssText = "position:absolute;left:-9999px;top:-9999px;";
  document.body.appendChild(hidden);

  new QRCode(hidden, {
    text: url,
    width: RENDER,
    height: RENDER,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  document.fonts.load(QR_ICON_FONT, QR_ICONS.join(" "))
    .then((f) => { _qrIconOk = f.length > 0; }, () => { _qrIconOk = false; })
    .then(() => setTimeout(() => {
      const src = hidden.querySelector("canvas");
      if (!src) { document.body.removeChild(hidden); return; }

      const canvas = document.getElementById("qrCanvas");
      const H = RENDER + QR_LABEL_H;
      canvas.width = RENDER;
      canvas.height = H;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, RENDER, H);
      ctx.drawImage(src, 0, 0, RENDER, RENDER);
      document.body.removeChild(hidden);

      drawQrFooter(ctx, RENDER, id, label);
      _qrParts = { src, id, label };
      overlayLogo(ctx, RENDER);
    }, 150));
}

const QR_ICONS = ["signal_cellular_alt_1_bar", "signal_cellular_alt_2_bar", "signal_cellular_alt"];
const QR_ICON_FONT = '72px "Material Symbols Outlined"';
let _qrIconOk = false;

function drawQrFooter(ctx, SIZE, id, label) {
  const cy = SIZE + QR_LABEL_H / 2;
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "middle";
  ctx.font = "700 48px Inter, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`#${id}`, 60, cy + 2);
  ctx.textAlign = "right";
  ctx.fillText(label, SIZE - 60, cy + 2);
  if (!_qrIconOk) return;

  const x = SIZE - 142 - ctx.measureText(label).width;
  ctx.font = QR_ICON_FONT;
  ctx.textAlign = "left";
  ctx.globalAlpha = 0.25;
  ctx.fillText(QR_ICONS[2], x, cy + 1);
  ctx.globalAlpha = 1;
  ctx.fillText(QR_ICONS[Object.values(DIFF_LABELS).indexOf(label)], x, cy + 1);
}

function overlayLogo(ctx, SIZE, onDone) {
  const logoSize = Math.round(SIZE * QR_LOGO_SCALE);
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize);
    onDone?.();
  };
  img.onerror = () => {
    const r = Math.round(SIZE * 0.11);
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${r}px Inter,sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AL", cx, cy);
    onDone?.();
  };
  img.src = "/logo/astrolab-mono.svg";
}

// ── Mobile sidebar toggle ─────────────────────────────────
const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("sidebarBackdrop");
const hamburgerBtn = document.getElementById("hamburgerBtn");
const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");

function openSidebar() { sidebar.classList.add("open"); backdrop.classList.add("open"); document.body.style.overflow = "hidden"; }
function closeSidebar() { sidebar.classList.remove("open"); backdrop.classList.remove("open"); document.body.style.overflow = ""; }

hamburgerBtn.addEventListener("click", () => sidebar.classList.contains("open") ? closeSidebar() : openSidebar());
sidebarCloseBtn.addEventListener("click", closeSidebar);
backdrop.addEventListener("click", closeSidebar);

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => { if (window.innerWidth <= 768) closeSidebar(); });
});

// ----------------------------------------------------------

document.querySelector("#check-all-entries").addEventListener("click", () => {
  if (document.querySelector("#check-all-entries").checked == true) {
    document.querySelectorAll(".check-the-entry").forEach(element => {
        element.checked = true;
        if (document.querySelector("#qToolbar").classList.contains("hidden")) document.querySelector("#qToolbar").classList.remove("hidden");
    });
  }
  else {
    document.querySelectorAll(".check-the-entry").forEach(element => {
      element.checked = false;
      if (!document.querySelector("#qToolbar").classList.contains("hidden")) document.querySelector("#qToolbar").classList.add("hidden");
    });
  }
});

document.querySelector("#delete-checked").addEventListener('click', async () => {
  const checked = document.querySelectorAll(".check-the-entry:checked");
  if (checked.length == 0) return;
  if (!await openConfirm("Usuń pytania", `Usunąć te pytania?\nZostaną usunięte też odpowiedzi graczy.`)) return;
  for (const element of checked) {
        const id = element.closest("tr").cells[1].textContent.trim();
        const q = questions.find((x) => String(x.id) === id); 
        if (q) {
          const { ok } = await api(`/astrolab-admin/api/questions/${id}`, { method: "DELETE" });
          ok ? toast("Wybrane pytania usunięte.") : toast("Błąd usuwania.", "err");
        };
    }
  loadQuestions()
})



// ── Init ──────────────────────────────────────────────────
loadDashboard();