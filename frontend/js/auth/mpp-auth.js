/* Client Supabase + session — chargé après config.js et le CDN Supabase. */
(function () {
  const AUTH_PAGES = {
    login: "connexion.html",
    register: "inscription.html",
    account: "mon-compte.html",
  };

  let client = null;
  let initPromise = null;
  let currentProfile = null;

  function getConfig() {
    return window.MPP_SUPABASE || {};
  }

  function isConfigured() {
    const cfg = getConfig();
    return Boolean(cfg.url && cfg.anonKey);
  }

  function translateAuthError(message) {
    const text = String(message || "").toLowerCase();
    if (text.includes("invalid login credentials")) {
      return "Email ou mot de passe incorrect.";
    }
    if (text.includes("user already registered")) {
      return "Un compte existe déjà avec cet email.";
    }
    if (text.includes("password")) {
      return "Le mot de passe doit contenir au moins 6 caractères.";
    }
    if (text.includes("email")) {
      return "Adresse email invalide.";
    }
    if (text.includes("username") || text.includes("profiles_username")) {
      return "Ce nom d'utilisateur est déjà pris.";
    }
    return message || "Une erreur est survenue.";
  }

  function getSupabaseGlobal() {
    return window.supabase;
  }

  async function ensureClient() {
    if (!isConfigured()) {
      throw new Error("Supabase n'est pas configuré. Renseignez frontend/js/auth/config.js.");
    }
    if (client) return client;

    if (!initPromise) {
      initPromise = (async () => {
        const lib = getSupabaseGlobal();
        if (!lib?.createClient) {
          throw new Error("Bibliothèque Supabase introuvable.");
        }
        const cfg = getConfig();
        client = lib.createClient(cfg.url, cfg.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
        client.auth.onAuthStateChange(() => {
          currentProfile = null;
          refreshAccountLink();
        });
        return client;
      })();
    }

    return initPromise;
  }

  async function getSession() {
    if (!isConfigured()) return null;
    const sb = await ensureClient();
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function getUser() {
    const session = await getSession();
    return session?.user ?? null;
  }

  async function fetchProfile(userId) {
    const sb = await ensureClient();
    const { data, error } = await sb
      .from("profiles")
      .select("id, username, email, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function getProfile(forceRefresh) {
    const user = await getUser();
    if (!user) {
      currentProfile = null;
      return null;
    }
    if (!forceRefresh && currentProfile?.id === user.id) {
      return currentProfile;
    }
    currentProfile = await fetchProfile(user.id);
    return currentProfile;
  }

  async function signUp({ username, email, password }) {
    const sb = await ensureClient();
    const safeUsername = String(username || "").trim();
    const { data, error } = await sb.auth.signUp({
      email: String(email || "").trim(),
      password,
      options: {
        data: { username: safeUsername },
      },
    });
    if (error) throw new Error(translateAuthError(error.message));

    if (data.user) {
      try {
        await sb.from("profiles").upsert({
          id: data.user.id,
          username: safeUsername,
          email: data.user.email || email,
        });
      } catch (profileError) {
        console.warn("Profil déjà créé par le trigger ou erreur upsert.", profileError);
      }
    }

    return data;
  }

  async function signIn({ email, password }) {
    const sb = await ensureClient();
    const { data, error } = await sb.auth.signInWithPassword({
      email: String(email || "").trim(),
      password,
    });
    if (error) throw new Error(translateAuthError(error.message));
    currentProfile = null;
    await getProfile(true);
    return data;
  }

  async function signOut() {
    const sb = await ensureClient();
    const { error } = await sb.auth.signOut();
    if (error) throw error;
    currentProfile = null;
    refreshAccountLink();
  }

  async function updateUsername(username) {
    const user = await getUser();
    if (!user) throw new Error("Non connecté.");

    const safeUsername = String(username || "").trim();
    if (!/^[a-zA-Z0-9._-]{2,32}$/.test(safeUsername)) {
      throw new Error("Nom d'utilisateur : 2–32 caractères (lettres, chiffres, . _ -).");
    }

    const sb = await ensureClient();
    const { error } = await sb
      .from("profiles")
      .update({ username: safeUsername })
      .eq("id", user.id);
    if (error) throw new Error(translateAuthError(error.message));

    currentProfile = null;
    return getProfile(true);
  }

  async function updatePassword({ currentPassword, newPassword, confirmPassword }) {
    const user = await getUser();
    if (!user?.email) throw new Error("Non connecté.");

    const current = String(currentPassword || "");
    const next = String(newPassword || "");
    const confirm = String(confirmPassword || "");

    if (!current) throw new Error("Indique ton mot de passe actuel.");
    if (next.length < 6) {
      throw new Error("Le nouveau mot de passe doit contenir au moins 6 caractères.");
    }
    if (next !== confirm) {
      throw new Error("Les nouveaux mots de passe ne correspondent pas.");
    }

    const sb = await ensureClient();
    const { error: verifyError } = await sb.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (verifyError) throw new Error("Mot de passe actuel incorrect.");

    const { error } = await sb.auth.updateUser({ password: next });
    if (error) throw new Error(translateAuthError(error.message));
  }

  function getRedirectTarget(fallback) {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (!next) return fallback || AUTH_PAGES.account;
    if (/^https?:\/\//i.test(next)) return fallback || AUTH_PAGES.account;
    if (next.startsWith("/") || next.includes("..")) return fallback || AUTH_PAGES.account;
    return next;
  }

  async function requireAuth(redirectToLogin) {
    const user = await getUser();
    if (user) return user;
    if (redirectToLogin !== false) {
      const returnPath = `${window.location.pathname.split("/").pop() || "mon-compte.html"}${window.location.search}`;
      window.location.href = `${AUTH_PAGES.login}?next=${encodeURIComponent(returnPath)}`;
    }
    return null;
  }

  function refreshAccountLink() {
    const links = document.querySelectorAll("[data-account-link]");
    const labels = document.querySelectorAll("[data-account-label]");

    getProfile()
      .then((profile) => {
        const loggedIn = Boolean(profile);
        const href = loggedIn ? AUTH_PAGES.account : AUTH_PAGES.login;
        const label = loggedIn ? profile.username || "Mon compte" : "Inscription / Connexion";

        links.forEach((link) => {
          link.href = href;
          link.classList.toggle("is-logged-in", loggedIn);
          link.setAttribute(
            "aria-label",
            loggedIn ? `Mon compte (${label})` : "Inscription ou connexion"
          );
        });
        labels.forEach((el) => {
          el.textContent = label;
        });
      })
      .catch(() => {
        links.forEach((link) => {
          link.href = AUTH_PAGES.login;
          link.classList.remove("is-logged-in");
        });
        labels.forEach((el) => {
          el.textContent = "Inscription / Connexion";
        });
      });
  }

  function showConfigBanner() {
    if (isConfigured()) return;
    document.querySelectorAll("[data-auth-config-warning]").forEach((el) => {
      el.hidden = false;
    });
  }

  async function init() {
    showConfigBanner();
    if (!isConfigured()) {
      refreshAccountLink();
      return;
    }
    try {
      await ensureClient();
      await getProfile();
    } catch (error) {
      console.warn("Auth init:", error);
    }
    refreshAccountLink();
  }

  window.MppAuth = {
    AUTH_PAGES,
    isConfigured,
    ensureClient,
    getSession,
    getUser,
    getProfile,
    signUp,
    signIn,
    signOut,
    updateUsername,
    updatePassword,
    getRedirectTarget,
    requireAuth,
    refreshAccountLink,
    translateAuthError,
    init,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
