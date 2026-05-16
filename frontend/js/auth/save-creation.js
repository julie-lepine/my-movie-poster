/* Boutons « Sauvegarder dans mon compte » (pages poster / vitrine). */
(function () {
  async function runSave(getPayload, feedbackSelector) {
    const feedbackEls = document.querySelectorAll(feedbackSelector);
    const setMsg = (text) => {
      feedbackEls.forEach((el) => {
        el.textContent = text;
      });
    };

    if (!window.MppAuth?.isConfigured()) {
      setMsg("Comptes non configurés.");
      return;
    }

    const payload = typeof getPayload === "function" ? getPayload() : null;
    if (!payload) {
      setMsg("Aucune création à sauvegarder.");
      return;
    }

    setMsg("Sauvegarde...");
    try {
      const saved = await window.MppCreations.save(payload);
      if (saved === null) return;
      setMsg("Enregistré dans ton compte.");
    } catch (error) {
      setMsg(error.message || "Sauvegarde impossible.");
    }
  }

  window.MppSaveCreation = { runSave };
})();
