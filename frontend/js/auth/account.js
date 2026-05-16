(function () {
  const profileForm = document.getElementById("accountProfileForm");
  const passwordForm = document.getElementById("accountPasswordForm");
  const profileFeedback = document.getElementById("accountProfileFeedback");
  const passwordFeedback = document.getElementById("accountPasswordFeedback");
  const creationsList = document.getElementById("accountCreationsList");
  const creationsEmpty = document.getElementById("accountCreationsEmpty");
  const creationsFeedback = document.getElementById("accountCreationsFeedback");
  const creationsDeleteAllBtn = document.getElementById("accountCreationsDeleteAll");
  const deleteCreationModal = document.getElementById("accountDeleteCreationModal");
  const deleteCreationTitle = document.getElementById("accountDeleteCreationTitle");
  const deleteCreationMessage = document.getElementById("accountDeleteCreationMessage");
  const deleteCreationCancel = document.getElementById("accountDeleteCreationCancel");
  const deleteCreationConfirm = document.getElementById("accountDeleteCreationConfirm");
  const logoutBtn = document.getElementById("accountLogout");
  const tabButtons = document.querySelectorAll("[data-account-tab]");
  const tabPanels = document.querySelectorAll("[data-account-panel]");

  let deleteCreationConfirmResolve = null;
  let deleteCreationLastFocus = null;

  function closeDeleteCreationModal(confirmed) {
    if (!deleteCreationModal) return;
    deleteCreationModal.hidden = true;
    if (deleteCreationConfirm) deleteCreationConfirm.disabled = false;
    if (deleteCreationCancel) deleteCreationCancel.disabled = false;
    if (deleteCreationConfirmResolve) {
      deleteCreationConfirmResolve(Boolean(confirmed));
      deleteCreationConfirmResolve = null;
    }
    deleteCreationLastFocus?.focus?.();
    deleteCreationLastFocus = null;
  }

  function openDeleteCreationModal({ title, message }) {
    if (!deleteCreationModal) return Promise.resolve(false);

    if (deleteCreationTitle && title) deleteCreationTitle.textContent = title;
    if (deleteCreationMessage) {
      deleteCreationMessage.textContent = message || "";
      deleteCreationMessage.hidden = !message;
    }

    deleteCreationLastFocus = document.activeElement;
    deleteCreationModal.hidden = false;
    deleteCreationCancel?.focus();

    return new Promise((resolve) => {
      deleteCreationConfirmResolve = resolve;
    });
  }

  deleteCreationCancel?.addEventListener("click", () => closeDeleteCreationModal(false));
  deleteCreationConfirm?.addEventListener("click", () => closeDeleteCreationModal(true));

  deleteCreationModal?.addEventListener("click", (event) => {
    if (event.target === deleteCreationModal) closeDeleteCreationModal(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || deleteCreationModal?.hidden) return;
    closeDeleteCreationModal(false);
  });

  function setFeedback(el, message, isError) {
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("auth-feedback--error", Boolean(isError));
    el.classList.toggle("auth-feedback--success", Boolean(message) && !isError);
  }

  function activateTab(tabId) {
    tabButtons.forEach((btn) => {
      const active = btn.dataset.accountTab === tabId;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    tabPanels.forEach((panel) => {
      panel.hidden = panel.dataset.accountPanel !== tabId;
    });
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.accountTab));
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get("tab") === "creations") activateTab("creations");

  async function loadProfile() {
    const profile = await window.MppAuth.getProfile();
    if (!profile) return;
    if (profileForm?.username) profileForm.username.value = profile.username || "";
    if (profileForm?.email) profileForm.email.value = profile.email || "";
  }

  profileForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback(profileFeedback, "");

    const submitBtn = profileForm.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    setFeedback(profileFeedback, "Enregistrement...");

    try {
      await window.MppAuth.updateUsername(profileForm.username?.value);
      setFeedback(profileFeedback, "Profil mis à jour.");
      window.MppAuth.refreshAccountLink();
    } catch (error) {
      setFeedback(profileFeedback, error.message || "Erreur.", true);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  passwordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback(passwordFeedback, "");

    const submitBtn = passwordForm.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    setFeedback(passwordFeedback, "Mise à jour...");

    try {
      await window.MppAuth.updatePassword({
        currentPassword: passwordForm.currentPassword?.value,
        newPassword: passwordForm.newPassword?.value,
        confirmPassword: passwordForm.confirmPassword?.value,
      });
      passwordForm.reset();
      setFeedback(passwordFeedback, "Mot de passe mis à jour.");
    } catch (error) {
      setFeedback(passwordFeedback, error.message || "Erreur.", true);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    try {
      await window.MppAuth.signOut();
      window.location.href = "connexion.html";
    } catch (error) {
      setFeedback(profileFeedback, error.message || "Déconnexion impossible.", true);
    }
  });

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }

  function buildCreationCartItem(creation) {
    const payload = creation.payload || {};
    return {
      ...payload,
      type: payload.type || creation.type || "quiz-poster",
    };
  }

  let accountCartPreviewLoadPromise = null;

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Impossible de charger ${src}.`));
      document.head.appendChild(script);
    });
  }

  async function ensureAccountCartPreview() {
    if (window.MppCartPreview?.openCartPreview) return window.MppCartPreview;

    if (!accountCartPreviewLoadPromise) {
      accountCartPreviewLoadPromise = (async () => {
        await loadScriptOnce("js/core/gallery-selection-layout.js");
        await loadScriptOnce("js/poster/poster-preview-host.js");
        await loadScriptOnce("js/pages/cart.js");
        return window.MppCartPreview;
      })().catch((error) => {
        accountCartPreviewLoadPromise = null;
        throw error;
      });
    }

    const api = await accountCartPreviewLoadPromise;
    if (!api?.openCartPreview) {
      throw new Error("Aperçu indisponible.");
    }
    return api;
  }

  function renderCreationCard(creation) {
    const item = buildCreationCartItem(creation);
    const card = document.createElement("article");
    card.className = "account-creation-card cart-item";

    const preview =
      window.MppCreations?.buildAccountCreationPreview?.(item) ||
      (() => {
        const empty = document.createElement("div");
        empty.className = "account-creation-preview account-creation-preview--empty";
        return empty;
      })();

    const body = document.createElement("div");
    body.className = "account-creation-body";

    const title = document.createElement("h3");
    title.textContent = creation.title || window.MppCreations.getCreationTitle(creation);

    const subtitle = document.createElement("p");
    subtitle.className = "account-creation-subtitle";
    subtitle.textContent = window.MppCreations.getCreationSubtitle(creation);

    const meta = document.createElement("p");
    meta.className = "account-creation-meta";
    meta.textContent = formatDate(creation.created_at);

    const actions = document.createElement("div");
    actions.className = "account-creation-actions";

    const cardFeedback = document.createElement("p");
    cardFeedback.className = "account-creation-card-feedback auth-feedback";
    cardFeedback.setAttribute("aria-live", "polite");

    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "account-creation-btn account-creation-btn--view";
    viewBtn.textContent = "Visualiser le poster";
    viewBtn.addEventListener("click", async () => {
      viewBtn.disabled = true;
      try {
        const api = await ensureAccountCartPreview();
        api.openCartPreview(item);
      } catch (error) {
        setFeedback(cardFeedback, error.message || "Impossible d'ouvrir l'aperçu.", true);
      } finally {
        viewBtn.disabled = false;
      }
    });

    const cartBtn = document.createElement("button");
    cartBtn.type = "button";
    cartBtn.className = "account-creation-btn account-creation-btn--accent";
    cartBtn.textContent = "Ajouter au panier";
    cartBtn.addEventListener("click", () => {
      try {
        window.MppCreations.addPayloadToCart(item);
        setFeedback(cardFeedback, "Poster ajouté au panier.");
      } catch (error) {
        setFeedback(cardFeedback, error.message || "Impossible d'ajouter au panier.", true);
      }
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "account-creation-btn account-creation-btn--danger";
    deleteBtn.textContent = "Supprimer";
    deleteBtn.addEventListener("click", async () => {
      const creationLabel = title.textContent || "cette création";
      const confirmed = await openDeleteCreationModal({
        title: "Supprimer cette création ?",
        message: `« ${creationLabel} » sera définitivement supprimée.`,
      });
      if (!confirmed) return;

      deleteBtn.disabled = true;

      try {
        await window.MppCreations.remove(creation.id);
        card.remove();
        if (!creationsList?.childElementCount) {
          if (creationsEmpty) creationsEmpty.hidden = false;
          syncCreationsToolbar(false);
        }
        setFeedback(creationsFeedback, "Création supprimée.");
      } catch (error) {
        setFeedback(creationsFeedback, error.message || "Erreur.", true);
      } finally {
        deleteBtn.disabled = false;
      }
    });

    actions.append(viewBtn, cartBtn, deleteBtn);
    body.append(title, subtitle, meta, actions, cardFeedback);
    card.append(preview, body);
    return card;
  }

  function syncCreationsToolbar(hasItems) {
    if (creationsDeleteAllBtn) creationsDeleteAllBtn.hidden = !hasItems;
  }

  async function loadCreations() {
    if (!creationsList) return;
    setFeedback(creationsFeedback, "");

    try {
      const items = await window.MppCreations.list();
      creationsList.replaceChildren();
      const hasItems = items.length > 0;
      if (creationsEmpty) creationsEmpty.hidden = hasItems;
      syncCreationsToolbar(hasItems);

      items.forEach((creation) => {
        creationsList.appendChild(renderCreationCard(creation));
      });
    } catch (error) {
      syncCreationsToolbar(false);
      setFeedback(creationsFeedback, error.message || "Impossible de charger les créations.", true);
    }
  }

  creationsDeleteAllBtn?.addEventListener("click", async () => {
    if (!window.MppCreations?.removeAll) return;

    const confirmed = await openDeleteCreationModal({
      title: "Supprimer toutes tes créations ?",
      message:
        "Cette action est irréversible. Toutes tes créations sauvegardées seront définitivement supprimées.",
    });
    if (!confirmed) return;

    creationsDeleteAllBtn.disabled = true;
    setFeedback(creationsFeedback, "Suppression...");

    try {
      await window.MppCreations.removeAll();
      creationsList?.replaceChildren();
      if (creationsEmpty) creationsEmpty.hidden = false;
      syncCreationsToolbar(false);
      setFeedback(creationsFeedback, "Toutes les créations ont été supprimées.");
    } catch (error) {
      setFeedback(creationsFeedback, error.message || "Impossible de tout supprimer.", true);
    } finally {
      creationsDeleteAllBtn.disabled = false;
    }
  });

  async function boot() {
    if (!window.MppAuth?.isConfigured()) return;

    const user = await window.MppAuth.requireAuth();
    if (!user) return;

    await loadProfile();
    await loadCreations();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
