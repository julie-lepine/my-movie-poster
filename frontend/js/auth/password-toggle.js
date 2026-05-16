(function () {
  function bindPasswordToggle(button) {
    const inputId = button.getAttribute("data-password-toggle");
    const input = inputId ? document.getElementById(inputId) : null;
    if (!input) return;

    button.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.classList.toggle("is-visible", show);
      button.setAttribute("aria-pressed", show ? "true" : "false");
      button.setAttribute("aria-label", show ? "Masquer le mot de passe" : "Afficher le mot de passe");
    });
  }

  document.querySelectorAll("[data-password-toggle]").forEach(bindPasswordToggle);
})();
