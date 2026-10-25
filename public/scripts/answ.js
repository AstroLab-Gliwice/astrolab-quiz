const p = new URLSearchParams(location.search);
const suffix = `<p style="margin-top:-10px">Skanuj kolejne kody QR!</p><a href="/" class="btn">← Wróć na stronę główną</a>`;

const content = p.get("alreadyAnswered") === "1"
  ? `<div class="big-icon">⚠️</div><h1>Już tu byłeś!</h1><p>Już próbowałeś odpowiedzieć na to pytanie.</p>${suffix}`
  : p.get("timeout") === "1"
    ? `<div class="big-icon">⏰</div><h1>Czas minął!</h1><p>Nie zdążyłeś odpowiedzieć na czas.</p>${suffix}`
    : `<div class="big-icon">✅</div><h1 style="margin-bottom:10px">Odpowiedź została wysłana!</h1>${suffix}`;

document.getElementById("card").innerHTML = content;