function readCartItems() {
  try {
    const value = JSON.parse(localStorage.getItem("mppCart") || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.warn("Impossible de lire le panier local.", error);
    return [];
  }
}

function writeCartItems(items) {
  localStorage.setItem("mppCart", JSON.stringify(items));
  window.updateMppCartIndicator?.();
}

function getCartItemTitle(item) {
  const title = String(item.customization?.title || "").trim();
  if (title) return title;
  if (item.type === "selection-poster") return "Ma sélection";
  if (item.type === "quiz-poster") return "Ton univers cinéma";
  return "Poster personnalisé";
}

function getCartItemSubtitle(item) {
  return String(item.customization?.subtitle || "").trim() || "Création personnalisée";
}

const CART_DEFAULT_BACKGROUND = "";
const CART_LOGO_SRC = "./assets/site/logo.png";
const CART_CIRCLE_SRC = "./assets/site/circle.png";

var _mppCartPreviewResizeTimer = 0;

function onCartPreviewWindowResize() {
  clearTimeout(_mppCartPreviewResizeTimer);
  _mppCartPreviewResizeTimer = window.setTimeout(() => {
    const modal = document.getElementById("cartPreviewModal");
    if (!modal || modal.hidden) return;
    const frame = modal.querySelector(".cart-live-poster-frame");
    if (frame) syncCartLivePosterFrame(frame);
  }, 150);
}

function getCartThumbnailSrc(src) {
  if (!src || src.includes("/thumbs/")) return src || "";
  return src.replace(/(^|\/)assets\/img\//, "$1assets/img/thumbs/");
}

function setCartTextStyle(el, customization = {}, scope) {
  const format = customization[`${scope}Format`] || {};
  const font = customization[`${scope}Font`];
  const color = customization[`${scope}Color`];
  const size = Number(customization[`${scope}Size`]);

  if (font) el.style.fontFamily = font;
  if (color) el.style.color = color;
  if (Number.isFinite(size) && size > 0) el.style.fontSize = `${size}px`;
  el.style.fontWeight = format.bold ? "900" : "";
  el.style.fontStyle = format.italic ? "italic" : "";
  el.style.textDecoration = format.strike ? "line-through" : "none";
}

function setCartBackground(el, customization = {}) {
  const backgroundImage = customization.backgroundImage || CART_DEFAULT_BACKGROUND;
  if (!backgroundImage) {
    el.style.removeProperty("background-image");
    return;
  }
  el.style.backgroundImage = `url("${String(backgroundImage).replace(/"/g, '\\"')}")`;
  el.style.backgroundRepeat = "no-repeat";
  el.style.backgroundPosition = "center";
  el.style.backgroundSize = "100% 100%";
}

function setCartFormatClasses(el, format = {}) {
  el.classList.toggle("is-editor-bold", Boolean(format.bold));
  el.classList.toggle("is-editor-italic", Boolean(format.italic));
  el.classList.toggle("is-editor-strike", Boolean(format.strike));
}

function applyCartQuizTextStyles(poster, title, subtitle, customization = {}) {
  if (customization.titleFont) poster.style.setProperty("--poster-title-font", customization.titleFont);
  if (customization.subtitleFont) {
    poster.style.setProperty("--poster-subtitle-font", customization.subtitleFont);
  }
  if (customization.titleColor) poster.style.setProperty("--poster-title-color", customization.titleColor);
  if (customization.subtitleColor) {
    poster.style.setProperty("--poster-subtitle-color", customization.subtitleColor);
  }
  if (customization.filmTitleColor) {
    poster.style.setProperty("--poster-film-title-color", customization.filmTitleColor);
  }
  if (customization.filmYearColor) {
    poster.style.setProperty("--poster-film-year-color", customization.filmYearColor);
  }

  const titleSize = Number(customization.titleSize);
  const subtitleSize = Number(customization.subtitleSize);
  if (Number.isFinite(titleSize) && titleSize > 0) {
    poster.style.setProperty("--poster-title-font-size", `${titleSize}px`);
  }
  if (Number.isFinite(subtitleSize) && subtitleSize > 0) {
    poster.style.setProperty("--poster-subtitle-font-size", `${subtitleSize}px`);
  }

  setCartFormatClasses(title, customization.titleFormat);
  setCartFormatClasses(subtitle, customization.subtitleFormat);
}

function createCartQuizFilmCard(film) {
  const card = document.createElement("div");
  card.className = "poster-film";

  const img = document.createElement("img");
  img.src = film.previewImage || film.image;
  if (film.previewImage && film.previewImage !== film.image) {
    img.dataset.fallbackSrc = film.image;
  }
  img.alt = "";
  img.decoding = "async";
  img.addEventListener(
    "error",
    () => {
      if (!img.dataset.fallbackSrc) return;
      img.src = img.dataset.fallbackSrc;
      delete img.dataset.fallbackSrc;
    },
    { passive: true }
  );
  protectImageElement(img);

  const info = document.createElement("div");
  info.className = "film-info";

  const title = document.createElement("div");
  title.className = "film-title";
  title.textContent = film.titre || "";
  title.title = film.titre || "";

  const year = document.createElement("div");
  year.className = "film-year";
  year.textContent = film.year || "";

  const circle = document.createElement("img");
  circle.className = "film-circle";
  circle.src = film.circleSrc || CART_CIRCLE_SRC;
  circle.alt = "";
  circle.decoding = "async";
  protectImageElement(circle);

  info.appendChild(circle);
  info.appendChild(title);
  info.appendChild(year);
  card.appendChild(img);
  card.appendChild(info);

  return card;
}

function getCartQuizLayoutCount(item, filmCount) {
  const layoutCount = Number(item.layoutCount || filmCount || 100);
  if (layoutCount <= 25) return 25;
  if (layoutCount <= 48) return 48;
  return 100;
}

function getCartQuizLayout(layoutCount) {
  const layoutByCount = {
    25: { cols: 5, gap: 18 },
    48: { cols: 6, gap: 14 },
    100: { cols: 10, gap: 7 },
  };
  return layoutByCount[layoutCount] || layoutByCount[100];
}

function getCartSelectionLayout(filmCount) {
  if (filmCount <= 25) {
    return { layoutCount: 25, cols: Math.min(5, Math.max(1, filmCount || 5)), gap: 18 };
  }
  if (filmCount <= 48) return { layoutCount: 48, cols: 6, gap: 14 };
  return { layoutCount: 100, cols: 10, gap: 7 };
}

function createCartQuizPosterPreview(item) {
  const customization = item.customization || {};
  const films = item.films || [];
  const poster = document.createElement("article");
  poster.className = "poster-sheet";
  setCartBackground(poster, customization);

  const layoutCount = getCartQuizLayoutCount(item, films.length);
  const layout = getCartQuizLayout(layoutCount);
  const rows = Math.ceil(layoutCount / layout.cols);
  poster.dataset.posterLayout = String(layoutCount);
  poster.classList.toggle("poster-sheet--fill-movie-grid", layoutCount === 48);

  const header = document.createElement("div");
  header.className = "poster-header";

  const title = document.createElement("div");
  title.className = "poster-title";
  title.textContent = getCartItemTitle(item);

  const subtitle = document.createElement("div");
  subtitle.className = "poster-subtitle";
  subtitle.textContent = getCartItemSubtitle(item);

  const grid = document.createElement("div");
  grid.className = "poster-grid";
  grid.dataset.layout = String(layoutCount);
  grid.style.setProperty("--poster-cols", String(layout.cols));
  grid.style.setProperty("--poster-rows", String(rows));
  grid.style.setProperty("--poster-gap", `${layout.gap}px`);

  const usesTail = layoutCount === 100 && films.length > 0;
  const tailStart = usesTail ? Math.min(films.length, layoutCount - (layoutCount % layout.cols)) : films.length;
  const circleSrc = customization.filmCircleSrc || CART_CIRCLE_SRC;
  films.slice(0, tailStart).forEach((film) => {
    grid.appendChild(
      createCartQuizFilmCard({
        ...film,
        circleSrc,
        previewImage: layoutCount === 100 ? getCartThumbnailSrc(film.image) : film.image,
      })
    );
  });

  if (usesTail && tailStart < films.length) {
    const tail = document.createElement("div");
    tail.className = "poster-grid-tail";
    tail.style.setProperty("--poster-tail-count", String(films.length - tailStart));
    films.slice(tailStart).forEach((film) => {
      tail.appendChild(
        createCartQuizFilmCard({
          ...film,
          circleSrc,
          previewImage: layoutCount === 100 ? getCartThumbnailSrc(film.image) : film.image,
        })
      );
    });
    grid.appendChild(tail);
  }

  const footer = document.createElement("footer");
  footer.className = "poster-footer";
  footer.setAttribute("aria-label", "Marque");
  const logo = document.createElement("img");
  logo.className = "poster-footer-logo";
  logo.src = CART_LOGO_SRC;
  logo.alt = "My Movies Poster";
  logo.decoding = "async";
  protectImageElement(logo);
  footer.appendChild(logo);

  header.appendChild(title);
  header.appendChild(subtitle);
  poster.appendChild(header);
  poster.appendChild(grid);
  poster.appendChild(footer);
  applyCartQuizTextStyles(poster, title, subtitle, customization);

  return poster;
}

function createCartSelectionFilmCard(film) {
  const item = document.createElement("div");
  item.className = "gallery-selection-film";

  const img = document.createElement("img");
  img.src = film.image;
  img.alt = "";
  img.decoding = "async";
  protectImageElement(img);

  const info = document.createElement("div");
  info.className = "gallery-selection-film-info";

  const circle = document.createElement("img");
  circle.className = "gallery-selection-film-circle";
  circle.src = CART_CIRCLE_SRC;
  circle.alt = "";
  circle.decoding = "async";
  protectImageElement(circle);

  const title = document.createElement("span");
  title.className = "gallery-selection-film-title";
  title.textContent = film.titre || "";

  const year = document.createElement("span");
  year.className = "gallery-selection-film-year";
  year.textContent = film.year || "";

  info.appendChild(circle);
  info.appendChild(title);
  info.appendChild(year);
  item.appendChild(img);
  item.appendChild(info);

  return item;
}

function getCartSelectionColumnCount(count) {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  if (count <= 16) return 4;
  if (count <= 25) return 5;
  return 6;
}

function getCartSelectionRowHeight(columnCount) {
  if (columnCount <= 1) return 210;
  if (columnCount <= 2) return 168;
  if (columnCount <= 3) return 136;
  if (columnCount <= 4) return 116;
  if (columnCount <= 5) return 104;
  return 92;
}

function createCartSelectionPosterPreview(item) {
  const customization = item.customization || {};
  const films = (item.films || []).filter((film) => film?.image).slice(0, 100);
  const poster = document.createElement("article");
  poster.className = "gallery-selection-poster poster-sheet";
  setCartBackground(poster, customization);

  const header = document.createElement("header");
  header.className = "poster-header";

  const title = document.createElement("div");
  title.className = "poster-title";
  title.textContent = getCartItemTitle(item);

  const subtitle = document.createElement("div");
  subtitle.className = "poster-subtitle";
  subtitle.textContent = getCartItemSubtitle(item);

  const grid = document.createElement("div");
  grid.className = "poster-grid";
  const layout = getCartSelectionLayout(films.length);
  const rowCount = Math.max(1, Math.ceil(Math.max(films.length, 1) / layout.cols));
  poster.dataset.posterLayout = String(layout.layoutCount);
  grid.dataset.layout = String(layout.layoutCount);
  grid.style.setProperty("--poster-cols", String(layout.cols));
  grid.style.setProperty("--poster-rows", String(rowCount));
  grid.style.setProperty("--poster-gap", `${layout.gap}px`);

  if (films.length) {
    films.forEach((film) => {
      grid.appendChild(
        createCartQuizFilmCard({
          ...film,
          circleSrc: customization.filmCircleSrc || CART_CIRCLE_SRC,
          previewImage: layout.layoutCount === 100 ? getCartThumbnailSrc(film.image) : film.image,
        })
      );
    });
  } else {
    const empty = document.createElement("p");
    empty.className = "gallery-selection-empty";
    empty.textContent = "Aucun film sélectionné.";
    grid.appendChild(empty);
  }

  const footer = document.createElement("footer");
  footer.className = "poster-footer";
  footer.setAttribute("aria-label", "Marque");
  const logo = document.createElement("img");
  logo.className = "poster-footer-logo";
  logo.src = CART_LOGO_SRC;
  logo.alt = "My Movies Poster";
  logo.decoding = "async";
  protectImageElement(logo);

  header.appendChild(title);
  header.appendChild(subtitle);
  footer.appendChild(logo);
  poster.appendChild(header);
  poster.appendChild(grid);
  poster.appendChild(footer);
  applyCartQuizTextStyles(poster, title, subtitle, customization);

  return poster;
}

function createCartPosterPreview(item, mode = "modal") {
  const frame = document.createElement("div");
  frame.className = "cart-live-poster-frame";
  frame.dataset.cartPreviewMode = mode;
  frame.dataset.cartPosterType = item.type || "quiz-poster";
  frame.appendChild(
    item.type === "selection-poster"
      ? createCartSelectionPosterPreview(item)
      : createCartQuizPosterPreview(item)
  );
  return frame;
}

function collectCartPosterFilmCards(grid) {
  return [
    ...grid.querySelectorAll(":scope > .poster-film"),
    ...grid.querySelectorAll(":scope > .poster-grid-tail .poster-film"),
  ];
}

function collectCartPosterFilmCardsForBandHeight(grid) {
  const main = [...grid.querySelectorAll(":scope > .poster-film")];
  if (grid.dataset.layout === "100" && main.length > 0) return main;
  return collectCartPosterFilmCards(grid);
}

function readCartCssNumber(el, propertyName, fallback) {
  const raw = getComputedStyle(el).getPropertyValue(propertyName);
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function fitCartPosterFilmTitle(titleEl) {
  if (!titleEl || titleEl.clientWidth < 1 || titleEl.clientHeight < 1) return;
  const fitKey = `${Math.round(titleEl.clientWidth)}x${Math.round(titleEl.clientHeight)}`;
  if (titleEl.dataset.fitKey === fitKey) return;

  const computed = getComputedStyle(titleEl);
  const currentFontSize = parseFloat(computed.fontSize) || 10;
  const maxSize = readCartCssNumber(titleEl, "--film-title-max-size", currentFontSize);
  const minSize = readCartCssNumber(titleEl, "--film-title-min-size", Math.max(5, maxSize * 0.45));
  const fits = () =>
    titleEl.scrollWidth <= titleEl.clientWidth + 1 &&
    titleEl.scrollHeight <= titleEl.clientHeight + 1;

  titleEl.style.setProperty("--film-title-fit-size", `${maxSize}px`);
  if (fits()) {
    titleEl.dataset.fitKey = fitKey;
    return;
  }

  let low = minSize;
  let high = maxSize;
  for (let i = 0; i < 12; i++) {
    const mid = (low + high) / 2;
    titleEl.style.setProperty("--film-title-fit-size", `${mid}px`);
    if (fits()) low = mid;
    else high = mid;
  }

  titleEl.style.setProperty("--film-title-fit-size", `${low.toFixed(2)}px`);
  titleEl.dataset.fitKey = fitKey;
}

function syncCartQuizPosterBandHeight(poster, cards) {
  poster.style.removeProperty("--poster-band-height");
  poster.removeAttribute("data-band-synced");
}

function syncCartQuizPosterMetrics(poster) {
  const grid = poster.querySelector(".poster-grid");
  if (!grid) return;

  syncCartQuizPosterBandHeight(poster);
  poster.querySelectorAll(".film-title").forEach(fitCartPosterFilmTitle);
  syncCartQuizPosterBandHeight(poster);
}

function sizeCartLivePosterFrame(frame) {
  const poster = frame.firstElementChild;
  const host = frame.parentElement;
  if (!poster || !host) return;

  const mode = frame.dataset.cartPreviewMode;
  const isThumbnail = mode === "thumbnail";
  const isSelection = frame.dataset.cartPosterType === "selection-poster";
  const selectionFallbackW = 340;
  const selectionFallbackH = Math.round((selectionFallbackW * 594) / 420);

  const rect = poster.getBoundingClientRect();
  let baseWidth = Math.round(rect.width) || poster.offsetWidth;
  let baseHeight = Math.round(rect.height) || poster.offsetHeight;

  if (isSelection) {
    if (baseWidth > 24 && (!baseHeight || baseHeight < 24)) {
      baseHeight = Math.round((baseWidth * 594) / 420);
    } else if (baseHeight > 24 && (!baseWidth || baseWidth < 24)) {
      baseWidth = Math.round((baseHeight * 420) / 594);
    }
    if (!baseWidth || !baseHeight || baseWidth < 24 || baseHeight < 24) {
      baseWidth = selectionFallbackW;
      baseHeight = selectionFallbackH;
    }
  } else if (!baseWidth || !baseHeight) {
    baseWidth = baseWidth || 1587;
    baseHeight = baseHeight || 2245;
  }

  const sizingHost =
    !isThumbnail && host.closest?.(".cart-preview-content") ? host.closest(".cart-preview-content") : host;

  const thumbFallback = 200;
  const availableWidth = Math.max(1, sizingHost.clientWidth || (isThumbnail ? thumbFallback : 520));
  const availableHeight = Math.max(
    1,
    isThumbnail
      ? sizingHost.clientHeight || sizingHost.clientWidth || availableWidth
      : Math.min(
          window.innerHeight * 0.78 - 100,
          Math.max(sizingHost.clientHeight, window.innerHeight * 0.5),
          820
        )
  );
  const scale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight, 1);
  if (!Number.isFinite(scale) || scale <= 0) return;

  const nextW = Math.max(1, Math.ceil(baseWidth * scale));
  const nextH = Math.max(1, Math.ceil(baseHeight * scale));

  frame.style.width = `${nextW}px`;
  frame.style.height = `${nextH}px`;
  poster.style.transform = `scale(${scale})`;
}

function syncCartLivePosterFrame(frame) {
  const poster = frame.firstElementChild;
  const mode = frame.dataset.cartPreviewMode;
  if (
    mode === "modal" &&
    poster?.classList.contains("poster-sheet") &&
    !poster.classList.contains("gallery-selection-poster")
  ) {
    syncCartQuizPosterMetrics(poster);
  }
  sizeCartLivePosterFrame(frame);
}

function scheduleCartLivePosterFrame(frame) {
  const run = () => requestAnimationFrame(() => syncCartLivePosterFrame(frame));
  if (document.fonts?.ready) document.fonts.ready.then(run);
  else run();

  let imgReflowTimer = 0;
  const onImgProgress = () => {
    clearTimeout(imgReflowTimer);
    imgReflowTimer = window.setTimeout(run, 60);
  };
  frame.querySelectorAll("img").forEach((img) => {
    if (!img.complete) img.addEventListener("load", onImgProgress, { passive: true });
  });

  if (frame._mppCartPosterRO) {
    frame._mppCartPosterRO.disconnect();
    frame._mppCartPosterRO = null;
  }
}

function openCartPreview(item) {
  const modal = document.getElementById("cartPreviewModal");
  const content = document.getElementById("cartPreviewContent");
  if (!modal || !content) return;

  content.innerHTML = "";
  modal.hidden = false;
  const previewFrame = document.createElement("div");
  previewFrame.className = "cart-preview-watermark-frame";
  const livePreview = createCartPosterPreview(item, "modal");
  previewFrame.appendChild(livePreview);
  content.appendChild(previewFrame);
  scheduleCartLivePosterFrame(livePreview);
  requestAnimationFrame(() => syncCartLivePosterFrame(livePreview));
  window.removeEventListener("resize", onCartPreviewWindowResize);
  window.addEventListener("resize", onCartPreviewWindowResize);
  document.getElementById("cartPreviewClose")?.focus();
}

function closeCartPreview() {
  window.removeEventListener("resize", onCartPreviewWindowResize);
  clearTimeout(_mppCartPreviewResizeTimer);
  _mppCartPreviewResizeTimer = 0;

  const modal = document.getElementById("cartPreviewModal");
  if (modal) modal.hidden = true;
}

function createCartItem(item, index) {
  const article = document.createElement("article");
  article.className = "cart-item";

  const preview = document.createElement("div");
  preview.className = "cart-item-preview";
  preview.classList.add("cart-item-preview--live");
  const livePreview = createCartPosterPreview(item, "thumbnail");
  preview.appendChild(livePreview);
  scheduleCartLivePosterFrame(livePreview);

  const details = document.createElement("div");
  details.className = "cart-item-details";

  const eyebrow = document.createElement("p");
  eyebrow.className = "cart-item-eyebrow";
  eyebrow.textContent = item.type === "quiz-poster" ? "Mon Poster" : "Sélection vitrine";

  const title = document.createElement("h2");
  title.textContent = getCartItemTitle(item);

  const subtitle = document.createElement("p");
  subtitle.className = "cart-item-subtitle";
  subtitle.textContent = getCartItemSubtitle(item);

  const meta = document.createElement("p");
  meta.className = "cart-item-meta";
  const filmCount = item.films?.length || 0;
  meta.textContent = `${filmCount} film${filmCount > 1 ? "s" : ""}`;

  const actions = document.createElement("div");
  actions.className = "cart-item-actions";

  const view = document.createElement("button");
  view.type = "button";
  view.className = "cart-view-item";
  view.textContent = "Visualiser le poster";
  view.addEventListener("click", () => openCartPreview(item));

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "cart-remove-item";
  remove.textContent = "Retirer";
  remove.addEventListener("click", () => {
    const items = readCartItems();
    items.splice(index, 1);
    writeCartItems(items);
    renderCart();
  });

  details.appendChild(eyebrow);
  details.appendChild(title);
  details.appendChild(subtitle);
  details.appendChild(meta);
  actions.appendChild(view);
  actions.appendChild(remove);
  details.appendChild(actions);
  article.appendChild(preview);
  article.appendChild(details);

  return article;
}

function renderCart() {
  const root = document.getElementById("cartItems");
  const summary = document.getElementById("cartSummary");
  const clearAll = document.getElementById("cartClearAll");
  if (!root) return;

  const items = readCartItems();
  root.innerHTML = "";

  if (summary) {
    summary.textContent = items.length
      ? `${items.length} poster${items.length > 1 ? "s" : ""} dans ton panier.`
      : "Ton panier est vide.";
  }
  if (clearAll) clearAll.hidden = items.length === 0;

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "cart-empty";
    empty.innerHTML = `
      <p>Aucun poster dans ton panier pour le moment.</p>
      <a href="vitrine.html">Découvrir la vitrine</a>
      <a href="mon-poster.html">Générer un poster</a>
    `;
    root.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    fragment.appendChild(createCartItem(item, index));
  });
  root.appendChild(fragment);
}

document.getElementById("cartClearAll")?.addEventListener("click", () => {
  writeCartItems([]);
  renderCart();
});

document.getElementById("cartPreviewClose")?.addEventListener("click", closeCartPreview);

document.getElementById("cartPreviewModal")?.addEventListener("click", (event) => {
  if (event.target.id === "cartPreviewModal") closeCartPreview();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCartPreview();
});

renderCart();
