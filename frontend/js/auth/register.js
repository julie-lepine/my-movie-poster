(function () {
  const form = document.getElementById("registerForm");
  const feedback = document.getElementById("registerFeedback");
  if (!form) return;

  function setFeedback(message, isError) {
    if (!feedback) return;
    feedback.textContent = message || "";
    feedback.classList.toggle("auth-feedback--error", Boolean(isError));
    feedback.classList.toggle("auth-feedback--success", Boolean(message) && !isError);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback("");

    if (!window.MppAuth?.isConfigured()) {
      setFeedback("Configuration Supabase manquante (config.js).", true);
      return;
    }

    const username = form.username?.value;
    const email = form.email?.value;
    const password = form.password?.value;
    const passwordConfirm = form.passwordConfirm?.value;

    if (password !== passwordConfirm) {
      setFeedback("Les mots de passe ne correspondent pas.", true);
      return;
    }

    if (String(password).length < 6) {
      setFeedback("Le mot de passe doit contenir au moins 6 caractères.", true);
      return;
    }

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    setFeedback("Création du compte...");

    try {
      const result = await window.MppAuth.signUp({ username, email, password });
      if (result?.session) {
        window.location.href = window.MppAuth.getRedirectTarget("mon-compte.html");
        return;
      }
      setFeedback(
        "Compte créé. Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.",
        false
      );
      form.reset();
    } catch (error) {
      setFeedback(error.message || "Inscription impossible.", true);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
