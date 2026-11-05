const returnTo   = new URLSearchParams(location.search).get("returnTo") || "/";
    const nickInput  = document.getElementById("nickInput");
    const submitBtn  = document.getElementById("submitBtn");
    const errorMsg   = document.getElementById("errorMsg");

    function setActive(active) {
      submitBtn.disabled = !active;
      submitBtn.classList.toggle("active", active);
    }

    nickInput.addEventListener("input", () => setActive(nickInput.value.trim() !== ""));
    document.addEventListener("keydown", (e) => { if (e.key === "Enter" && !submitBtn.disabled) register(); });
    submitBtn.addEventListener("click", register);

    async function register() {
      const nick = nickInput.value.trim();
      if (!nick) return;
        
      setActive(false);
      errorMsg.style.display = "none";

      try {
        await fetch('/filterlist.txt')
        .then(response => {
            if (!response.ok) {
                throw new Error('Nie udało się pobrać pliku i tyle no. I masz problem no');
            }
            return response.text();
        })
        .then(tekst => {
            const tablica = tekst
            .split(/\r?\n/)
            .map(linia => linia.trim())
            .filter(linia => linia.length > 0);
            if (tablica.some(el => nick.toLowerCase().includes(el))) {
                errorMsg.textContent = data.error || "Ty niegrzeczny chłopczyku.";
                errorMsg.style.display = "block";
                setActive(nick !== "");
                return;
            };
        });
        const res = await fetch("/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nick, returnTo }),
        });
        const data = await res.json();

        if (!res.ok) {
          errorMsg.textContent = data.error || "Wystąpił błąd. Spróbuj ponownie.";
          errorMsg.style.display = "block";
          setActive(nick !== "");
          return;
        }

        location.replace(data.redirectTo);
      } catch {
        errorMsg.textContent = "Problem z połączeniem. Sprawdź internet i spróbuj ponownie.";
        errorMsg.style.display = "block";
        setActive(nickInput.value.trim() !== "");
      }
    }