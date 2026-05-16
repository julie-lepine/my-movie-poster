(function () {
  const profileForm = document.getElementById("accountProfileForm");
  const passwordForm = document.getElementById("accountPasswordForm");
  const profileFeedback = document.getElementById("accountProfileFeedback");
  const passwordFeedback = document.getElementById("accountPasswordFeedback");
  const creationsList = document.getElementById("accountCreationsList");
  const creationsEmpty = document.getElementById("accountCreationsEmpty");
  const creationsFeedback = document.getElementById("accountCreationsFeedback");
  const logoutBtn = document.getElementById("accountLogout");
  const tabButtons = document.querySelectorAll("[data-account-tab]");
  const tabPanels = document.querySelectorAll("[data-account-panel]");

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

  function renderCreationCard(creation) {
    const payload = creation.payload || {};
    const films = Array.isArray(payload.films) ? payload.films : [];
    const card = document.createElement("article");
    card.className = "account-creation-card";

    const preview = document.createElement("div");
    preview.className = "account-creation-preview";
    films.slice(0, 9).forEach((film) => {
      const img = document.createElement("img");
      img.src = window.MppCreations.getThumbSrc(film.image);
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      preview.appendChild(img);
    });
    if (!preview.childElementCount) {
      preview.classList.add("account-creation-preview--empty");
    }

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

    const cartBtn = document.createElement("button");
    cartBtn.type = "button";
    cartBtn.className = "account-creation-btn account-creation-btn--accent";
    cartBtn.textContent = "Ajouter au panier";
    cartBtn.addEventListener("click", () => {
      window.MppCreations.addPayloadToCart(payload);
      setFeedback(creationsFeedback, "Ajouté au panier.");
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "account-creation-btn account-creation-btn--danger";
    deleteBtn.textContent = "Supprimer";
    deleteBtn.addEventListener("click", async () => {
      if (!window.confirm("Supprimer cette création ?")) return;
      try {
        await window.MppCreations.remove(creation.id);
        card.remove();
        if (!creationsList?.childElementCount && creationsEmpty) {
          creationsEmpty.hidden = false;
        }
        setFeedback(creationsFeedback, "Création supprimée.");
      } catch (error) {
        setFeedback(creationsFeedback, error.message || "Erreur.", true);
      }
    });

    actions.append(cartBtn, deleteBtn);
    body.append(title, subtitle, meta, actions);
    card.append(preview, body);
    return card;
  }

  async function loadCreations() {
    if (!creationsList) return;
    setFeedback(creationsFeedback, "");

    try {
      const items = await window.MppCreations.list();
      creationsList.replaceChildren();
      if (creationsEmpty) creationsEmpty.hidden = items.length > 0;

      items.forEach((creation) => {
        creationsList.appendChild(renderCreationCard(creation));
      });
    } catch (error) {
      setFeedback(creationsFeedback, error.message || "Impossible de charger les créations.", true);
    }
  }

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
