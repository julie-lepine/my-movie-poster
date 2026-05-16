(function () {
  const form = document.getElementById("loginForm");
  const feedback = document.getElementById("loginFeedback");
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

    const email = form.email?.value;
    const password = form.password?.value;
    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    setFeedback("Connexion...");

    try {
      await window.MppAuth.signIn({ email, password });
      window.location.href = window.MppAuth.getRedirectTarget("mon-compte.html");
    } catch (error) {
      setFeedback(error.message || "Connexion impossible.", true);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
