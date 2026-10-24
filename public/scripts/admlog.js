// login

async function login() {
      const pwd = document.getElementById("pwd").value;
      const err = document.getElementById("err");
      err.style.display = "none";

      const res = await fetch("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });

      if (res.ok) {
        location.replace("/admin");
      } else {
        err.style.display = "block";
        document.getElementById("pwd").select();
      }
    }

    document.getElementById("btn").addEventListener("click", login);

    document.getElementById("togglePwd").addEventListener("click", () => {
      const input = document.getElementById("pwd");
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      document.getElementById("eyeIcon").src = isPassword
        ? `/icons/visoff_black.svg`
        : `/icons/vison_black.svg`;
    });

    
    document.getElementById("pwd").addEventListener("keydown", (e) => {
      if (e.key === "Enter") login();
    });

    const card = document.querySelector(".card");
    card.classList.add("animate");
    card.addEventListener("animationend", () => card.classList.remove("animate"), { once: true });