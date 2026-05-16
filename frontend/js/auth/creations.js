/* Sauvegarde et lecture des créations utilisateur (Supabase). */
(function () {
  function getCreationTitle(item) {
    const title = String(item?.customization?.title || item?.payload?.customization?.title || "").trim();
    if (title) return title;
    const payload = item?.payload || item;
    if (payload?.type === "square-frame-poster") {
      const filmTitle = String(payload.films?.[0]?.titre || "").trim();
      return filmTitle || "Affiche encadrée";
    }
    if (payload?.type === "selection-poster") return "Ma sélection";
    if (payload?.type === "quiz-poster") return "Ton univers cinéma";
    return "Poster personnalisé";
  }

  function getCreationSubtitle(item) {
    const payload = item?.payload || item;
    if (payload?.type === "square-frame-poster") return "Format carré · cadre personnalisable";
    const sub = String(payload?.customization?.subtitle || "").trim();
    return sub || "Création personnalisée";
  }

  function normalizePayload(cartItem) {
    if (!cartItem || typeof cartItem !== "object") {
      throw new Error("Création invalide.");
    }
    return {
      ...cartItem,
      addedAt: cartItem.addedAt || new Date().toISOString(),
    };
  }

  async function save(cartItem) {
    if (!window.MppAuth?.isConfigured()) {
      throw new Error("Comptes non configurés.");
    }
    const user = await window.MppAuth.getUser();
    if (!user) {
      const page = window.location.pathname.split("/").pop() || "index.html";
      const returnPath = `${page}${window.location.search}`;
      window.location.href = `connexion.html?next=${encodeURIComponent(returnPath)}`;
      return null;
    }

    const payload = normalizePayload(cartItem);
    const sb = await window.MppAuth.ensureClient();
    const { data, error } = await sb
      .from("creations")
      .insert({
        user_id: user.id,
        type: payload.type || "custom",
        title: getCreationTitle({ payload }),
        payload,
      })
      .select("id, type, title, payload, created_at")
      .single();

    if (error) throw error;
    return data;
  }

  async function list() {
    const user = await window.MppAuth.getUser();
    if (!user) return [];

    const sb = await window.MppAuth.ensureClient();
    const { data, error } = await sb
      .from("creations")
      .select("id, type, title, payload, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async function remove(creationId) {
    const user = await window.MppAuth.getUser();
    if (!user) throw new Error("Non connecté.");

    const sb = await window.MppAuth.ensureClient();
    const { error } = await sb.from("creations").delete().eq("id", creationId).eq("user_id", user.id);
    if (error) throw error;
  }

  async function removeAll() {
    const user = await window.MppAuth.getUser();
    if (!user) throw new Error("Non connecté.");

    const sb = await window.MppAuth.ensureClient();
    const { error } = await sb.from("creations").delete().eq("user_id", user.id);
    if (error) throw error;
  }

  function addPayloadToCart(payload) {
    const item = normalizePayload(payload);
    const existing = JSON.parse(localStorage.getItem("mppCart") || "[]");
    const cart = Array.isArray(existing) ? existing : [];
    cart.push(item);
    localStorage.setItem("mppCart", JSON.stringify(cart));
    window.updateMppCartIndicator?.();
  }

  function getThumbSrc(image) {
    if (!image) return "";
    if (image.includes("/thumbs/")) return image;
    return image.replace(/(^|\/)assets\/img\//, "$1assets/img/thumbs/");
  }

  function getPreviewGridCols(count) {
    if (count <= 1) return 1;
    if (count <= 4) return 2;
    return 3;
  }

  /** Aperçu léger pour Mes créations (mosaïque thumbs, pas de poster DOM live). */
  function buildAccountCreationPreview(item) {
    const wrap = document.createElement("div");
    wrap.className = "account-creation-preview";

    const films = (item?.films || []).filter((film) => film?.image);
    if (!films.length) {
      wrap.classList.add("account-creation-preview--empty");
      return wrap;
    }

    const maxCells = item?.type === "square-frame-poster" ? 1 : 9;
    const cells = films.slice(0, maxCells);
    const cols = getPreviewGridCols(cells.length);

    const grid = document.createElement("div");
    grid.className = "account-creation-preview-grid";
    grid.style.setProperty("--account-preview-cols", String(cols));

    cells.forEach((film) => {
      const img = document.createElement("img");
      img.src = getThumbSrc(film.image);
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.draggable = false;
      grid.appendChild(img);
    });

    const badge = document.createElement("span");
    badge.className = "account-creation-preview-badge";
    badge.textContent = `${films.length} film${films.length > 1 ? "s" : ""}`;

    wrap.append(grid, badge);
    return wrap;
  }

  window.MppCreations = {
    getCreationTitle,
    getCreationSubtitle,
    save,
    list,
    remove,
    removeAll,
    addPayloadToCart,
    getThumbSrc,
    buildAccountCreationPreview,
  };
})();
