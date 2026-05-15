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
  if (item.type === "square-frame-poster") {
    const filmTitle = String(item.films?.[0]?.titre || "").trim();
    return filmTitle || "Affiche encadrée";
  }
  if (item.type === "selection-poster") return "Ma sélection";
  if (item.type === "quiz-poster") return "Ton univers cinéma";
  return "Poster personnalisé";
}

function getCartItemSubtitle(item) {
  if (item.type === "square-frame-poster") return "Format carré · cadre personnalisable";
  return String(item.customization?.subtitle || "").trim() || "Création personnalisée";
}

const CART_DEFAULT_BACKGROUND = "";
const CART_LOGO_SRC = "./assets/site/logo.png";
const CART_CIRCLE_SRC = "./assets/site/circle.png";
/** Même gabarit d’aperçu que la vitrine (px). */
const CART_GALLERY_PREVIEW_W = 340;
const CART_GALLERY_PREVIEW_H = Math.round((CART_GALLERY_PREVIEW_W * 594) / 420);
const CART_SQUARE_PREVIEW_W = 340;
const CART_SQUARE_PREVIEW_H = 340;

var _mppCartPreviewResizeTimer = 0;
var _cartModalPreviewGen = 0;
var _cartModalPreviewImgTimer = 0;
var _cartModalPreviewUpgradeTimer = 0;
const CART_MODAL_UPGRADE_BATCH = 12;
var _cartThumbIo = null;
var _cartThumbRootRo = null;
var _cartThumbLayoutTimer = 0;
var _cartThumbImgTimer = 0;
var _cartThumbFontsReady = false;

function onCartPreviewWindowResize() {
  clearTimeout(_mppCartPreviewResizeTimer);
  _mppCartPreviewResizeTimer = window.setTimeout(() => {
    const modal = document.getElementById("cartPreviewModal");
    if (!modal || modal.hidden) return;
    const quizHost = modal.querySelector(".cart-poster-preview-host");
    if (quizHost) {
      const poster = quizHost.querySelector(".poster-sheet");
      if (poster) syncCartQuizModalPreview(quizHost, poster);
      return;
    }
    const frame = modal.querySelector(".cart-live-poster-frame");
    if (frame) syncCartLivePosterFrame(frame);
  }, 150);
}

function getCartThumbnailSrc(src) {
  if (!src || src.includes("/thumbs/")) return src || "";
  return src.replace(/(^|\/)assets\/img\//, "$1assets/img/thumbs/");
}

function getCartFilmImageSrc(image, useThumb) {
  const src = image || "";
  return useThumb ? getCartThumbnailSrc(src) : src;
}

function getCartModalPreviewOptions() {
  return { useFilmThumbs: true, deferFullSrc: true };
}

function protectCartImagesIn(root) {
  if (!root) return;
  root.querySelectorAll("img:not([data-mpp-img-protected])").forEach((img) => {
    protectImageElement(img);
    img.dataset.mppImgProtected = "1";
  });
}

function teardownCartThumbObservers() {
  if (_cartThumbIo) {
    _cartThumbIo.disconnect();
    _cartThumbIo = null;
  }
  if (_cartThumbRootRo) {
    _cartThumbRootRo.disconnect();
    _cartThumbRootRo = null;
  }
  clearTimeout(_cartThumbLayoutTimer);
  clearTimeout(_cartThumbImgTimer);
  _cartThumbLayoutTimer = 0;
  _cartThumbImgTimer = 0;
}

function runWhenCartThumbFontsReady(fn) {
  if (_cartThumbFontsReady) {
    fn();
    return;
  }
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      _cartThumbFontsReady = true;
      fn();
    });
  } else {
    _cartThumbFontsReady = true;
    fn();
  }
}

function flushCartThumbnailLayout(frames) {
  const list = frames.filter(Boolean);
  if (!list.length) return;
  runWhenCartThumbFontsReady(() => {
    requestAnimationFrame(() => {
      list.forEach((frame) => {
        if (!frame.isConnected) return;
        syncCartThumbnailPosterFrame(frame);
        frame.dataset.cartThumbSized = "1";
      });
    });
  });
}

function scheduleCartThumbnailLayoutBatch(frames) {
  clearTimeout(_cartThumbLayoutTimer);
  _cartThumbLayoutTimer = window.setTimeout(() => flushCartThumbnailLayout(frames), 48);
}

function layoutVisibleCartThumbnails(root) {
  if (!root) return;
  const frames = [];
  root.querySelectorAll(".cart-thumb-poster-frame").forEach((frame) => {
    if (frame.dataset.cartThumbSized === "1") return;
    const item = frame.closest(".cart-item");
    if (!item) return;
    const rect = item.getBoundingClientRect();
    if (rect.bottom < -40 || rect.top > window.innerHeight + 40) return;
    frame.dataset.cartThumbSized = "1";
    frames.push(frame);
  });
  flushCartThumbnailLayout(frames);
}

function initCartThumbIntersectionObserver(root) {
  if (!root || typeof IntersectionObserver === "undefined") {
    layoutVisibleCartThumbnails(root);
    return;
  }

  if (_cartThumbIo) _cartThumbIo.disconnect();

  _cartThumbIo = new IntersectionObserver(
    (entries) => {
      const batch = [];
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const frame = entry.target.querySelector(".cart-thumb-poster-frame");
        if (!frame || frame.dataset.cartThumbSized === "1") return;
        _cartThumbIo.unobserve(entry.target);
        frame.dataset.cartThumbSized = "1";
        batch.push(frame);
      });
      if (batch.length) scheduleCartThumbnailLayoutBatch(batch);
    },
    { root: null, rootMargin: "160px 0px", threshold: 0.02 }
  );

  root.querySelectorAll(".cart-item").forEach((item) => _cartThumbIo.observe(item));
}

function initCartThumbResizeObserver(root) {
  if (!root || typeof ResizeObserver === "undefined") return;
  if (_cartThumbRootRo) _cartThumbRootRo.disconnect();
  _cartThumbRootRo = new ResizeObserver(() => {
    clearTimeout(_cartThumbLayoutTimer);
    _cartThumbLayoutTimer = window.setTimeout(() => {
      const frames = [];
      root.querySelectorAll(".cart-thumb-poster-frame[data-cart-thumb-sized='1']").forEach((frame) => {
        if (frame.isConnected) frames.push(frame);
      });
      frames.forEach((frame) => {
        delete frame.dataset.cartThumbSized;
      });
      flushCartThumbnailLayout(frames);
    }, 120);
  });
  _cartThumbRootRo.observe(root);
}

function setupCartThumbImageReflow(root) {
  if (!root || root._mppCartThumbImgHandler) return;
  const onImgEvent = () => {
    clearTimeout(_cartThumbImgTimer);
    _cartThumbImgTimer = window.setTimeout(() => {
      const frames = [];
      root.querySelectorAll(".cart-thumb-poster-frame[data-cart-thumb-sized='1']").forEach((frame) => {
        if (frame.isConnected) frames.push(frame);
      });
      if (frames.length) scheduleCartThumbnailLayoutBatch(frames);
    }, 150);
  };
  root.addEventListener("load", onImgEvent, true);
  root._mppCartThumbImgHandler = onImgEvent;
}

function startCartThumbPipeline(root) {
  if (!root) return;
  initCartThumbIntersectionObserver(root);
  initCartThumbResizeObserver(root);
  setupCartThumbImageReflow(root);
  layoutVisibleCartThumbnails(root);
}

function scheduleCartThumbPipelineStart(root) {
  const start = () => startCartThumbPipeline(root);
  requestAnimationFrame(() => {
    const idle = window.requestIdleCallback;
    if (typeof idle === "function") idle(start, { timeout: 800 });
    else window.setTimeout(start, 1);
  });
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

function createCartQuizFilmCard(film, options = {}) {
  const card = document.createElement("div");
  card.className = "poster-film";
  const useThumbs = options.useFilmThumbs === true;
  const fullSrc = film.image || "";
  const displaySrc = film.previewImage || getCartFilmImageSrc(fullSrc, useThumbs);

  const img = document.createElement("img");
  img.src = displaySrc;
  if (options.deferFullSrc && fullSrc && displaySrc !== fullSrc) {
    img.dataset.cartFullSrc = fullSrc;
  } else if (displaySrc !== fullSrc && fullSrc) {
    img.dataset.fallbackSrc = fullSrc;
  }
  img.alt = "";
  img.decoding = "async";
  if (options.lazyImages) {
    img.loading = "lazy";
    img.fetchPriority = "low";
  } else if (options.deferFullSrc) {
    img.fetchPriority = "high";
  }
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
  if (options.lazyImages) circle.loading = "lazy";
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

function createCartQuizPosterPreview(item, previewOptions = {}) {
  const customization = item.customization || {};
  const films = item.films || [];
  const useFilmThumbs = previewOptions.useFilmThumbs === true;
  const lazyImages = previewOptions.lazyImages === true;
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
  const cardOptions = { useFilmThumbs, lazyImages };
  films.slice(0, tailStart).forEach((film) => {
    grid.appendChild(createCartQuizFilmCard({ ...film, circleSrc }, cardOptions));
  });

  if (usesTail && tailStart < films.length) {
    const tail = document.createElement("div");
    tail.className = "poster-grid-tail";
    tail.style.setProperty("--poster-tail-count", String(films.length - tailStart));
    films.slice(tailStart).forEach((film) => {
      tail.appendChild(createCartQuizFilmCard({ ...film, circleSrc }, cardOptions));
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
  if (lazyImages) logo.loading = "lazy";
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

function createCartSquareFramePosterPreview(item, previewOptions = {}) {
  const useFilmThumbs = previewOptions.useFilmThumbs === true;
  const lazyImages = previewOptions.lazyImages === true;
  const deferFull = previewOptions.deferFullSrc === true;
  const film = (item.films || [])[0];
  const article = document.createElement("article");
  article.className = "gallery-square-poster mpp-square-frame-poster cart-square-frame-poster";

  const rawPct = Number(item.frameInsetPct);
  const pct =
    Number.isFinite(rawPct) && rawPct > 0 && rawPct < 50 ? rawPct : 8;
  article.style.setProperty("--gallery-square-frame-pct", `${pct}%`);
  article.style.backgroundColor = String(item.frameColor || "#ffffff").trim() || "#ffffff";

  const slot = document.createElement("div");
  slot.className = "gallery-square-poster__image-slot";

  const img = document.createElement("img");
  const fullSrc = film?.image || "";
  img.src = useFilmThumbs ? getCartThumbnailSrc(fullSrc) : fullSrc;
  img.alt = film?.titre ? `Affiche ${film.titre}` : "";
  img.decoding = "async";
  if (lazyImages) img.loading = "lazy";
  if (deferFull && useFilmThumbs && fullSrc && img.src !== fullSrc) {
    img.dataset.cartFullSrc = fullSrc;
  }
  protectImageElement(img);

  slot.appendChild(img);
  article.appendChild(slot);
  return article;
}

function createCartSelectionPosterPreview(item, previewOptions = {}) {
  const customization = item.customization || {};
  const films = (item.films || []).filter((film) => film?.image).slice(0, 100);
  const useFilmThumbs = previewOptions.useFilmThumbs === true;
  const lazyImages = previewOptions.lazyImages === true;
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
        createCartQuizFilmCard(
          {
            ...film,
            circleSrc: customization.filmCircleSrc || CART_CIRCLE_SRC,
          },
          { useFilmThumbs, lazyImages }
        )
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
  if (lazyImages) logo.loading = "lazy";
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
  const isThumbnail = mode === "thumbnail";
  const previewOptions = isThumbnail
    ? { useFilmThumbs: true, lazyImages: true }
    : getCartModalPreviewOptions();
  const frame = document.createElement("div");
  frame.className = isThumbnail ? "cart-thumb-poster-frame" : "cart-live-poster-frame";
  frame.dataset.cartPosterType = item.type || "quiz-poster";
  if (isThumbnail && item.type === "square-frame-poster") {
    frame.classList.add("cart-thumb-poster-frame--square");
  }
  if (!isThumbnail) frame.dataset.cartPreviewMode = mode;
  frame.appendChild(
    item.type === "square-frame-poster"
      ? createCartSquareFramePosterPreview(item, previewOptions)
      : item.type === "selection-poster"
        ? createCartSelectionPosterPreview(item, previewOptions)
        : createCartQuizPosterPreview(item, previewOptions)
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

/** Modal vitrine : fit titres seulement (inchangé). */
function syncCartGalleryPosterMetrics(poster) {
  poster.querySelectorAll(".film-title").forEach((titleEl) => {
    delete titleEl.dataset.fitKey;
    fitCartPosterFilmTitle(titleEl);
  });
}

/** Vignette panier : titres + cellules comme Mon Poster, après gabarit 340px. */
function syncCartThumbPosterMetrics(poster) {
  poster.querySelectorAll(".film-title").forEach((titleEl) => {
    delete titleEl.dataset.fitKey;
  });
  syncCartQuizPosterMetrics(poster);
}

function prepareCartGalleryPosterForMeasure(poster) {
  poster.style.width = `${CART_GALLERY_PREVIEW_W}px`;
  poster.style.maxWidth = `${CART_GALLERY_PREVIEW_W}px`;
  poster.style.minWidth = "0";
  poster.style.height = "auto";
  poster.style.minHeight = "0";
  poster.style.maxHeight = "none";
}

function prepareCartSquarePosterForMeasure(poster) {
  poster.style.width = `${CART_SQUARE_PREVIEW_W}px`;
  poster.style.maxWidth = `${CART_SQUARE_PREVIEW_W}px`;
  poster.style.minWidth = "0";
  poster.style.height = `${CART_SQUARE_PREVIEW_H}px`;
  poster.style.minHeight = `${CART_SQUARE_PREVIEW_H}px`;
  poster.style.maxHeight = `${CART_SQUARE_PREVIEW_H}px`;
}

/** Mon Poster vignette : même gabarit px que la vitrine (évite la lamelle étroite). */
function prepareCartQuizPosterForMeasure(poster) {
  poster.style.width = `${CART_GALLERY_PREVIEW_W}px`;
  poster.style.maxWidth = `${CART_GALLERY_PREVIEW_W}px`;
  poster.style.minWidth = "0";
  poster.style.height = "auto";
  poster.style.minHeight = "0";
  poster.style.maxHeight = "none";
}

/** Vignette poster carré : le poster occupe toute la largeur du frame (cellule déjà carrée). */
function sizeCartThumbSquarePosterFrame(frame, poster) {
  poster.style.removeProperty("transform");
  poster.style.removeProperty("width");
  poster.style.removeProperty("max-width");
  poster.style.removeProperty("min-width");
  poster.style.removeProperty("height");
  poster.style.removeProperty("min-height");
  poster.style.removeProperty("max-height");

  frame.style.removeProperty("transform");
  frame.style.removeProperty("width");
  frame.style.removeProperty("height");
  frame.style.removeProperty("max-width");
  frame.style.removeProperty("max-height");

  frame.style.width = "100%";
  frame.style.removeProperty("height");
  frame.style.maxWidth = "100%";

  void poster.offsetWidth;
}

function sizeCartThumbFixedPreviewFrame(
  frame,
  poster,
  host,
  prepareMeasure,
  syncMetrics,
  baseWidth = CART_GALLERY_PREVIEW_W,
  baseHeight = CART_GALLERY_PREVIEW_H
) {
  poster.style.removeProperty("transform");
  frame.style.removeProperty("width");
  frame.style.removeProperty("height");
  frame.style.removeProperty("max-width");
  frame.style.removeProperty("max-height");

  prepareMeasure(poster);
  void poster.offsetWidth;
  if (typeof syncMetrics === "function") syncMetrics(poster);

  const hostRect = host.getBoundingClientRect();
  const fallback = 200;
  const availableWidth = Math.max(
    1,
    Math.floor(hostRect.width) || host.clientWidth || fallback
  );
  const availableHeight = Math.max(
    1,
    Math.floor(hostRect.height) || host.clientHeight || host.clientWidth || fallback
  );
  const scale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight);
  if (!Number.isFinite(scale) || scale <= 0) return;

  frame.style.width = `${Math.max(1, Math.ceil(baseWidth * scale))}px`;
  frame.style.height = `${Math.max(1, Math.ceil(baseHeight * scale))}px`;
  frame.style.maxWidth = "100%";
  frame.style.maxHeight = "100%";
  poster.style.transformOrigin = "center center";
  poster.style.transform = `scale(${scale})`;
}

function isCartGalleryStylePoster(poster) {
  return poster?.classList.contains("gallery-selection-poster");
}

/** Modal vitrine — gabarit 340px + scale (inchangé). */
function sizeCartLivePosterFrame(frame) {
  const poster = frame.firstElementChild;
  const host = frame.parentElement;
  if (!poster || !host) return;

  const posterType = frame.dataset.cartPosterType || "quiz-poster";

  if (posterType === "square-frame-poster") {
    const sizingHost = host.closest?.(".cart-preview-content") || host;
    const hostRect = sizingHost.getBoundingClientRect();
    const previewPad = 40;

    prepareCartSquarePosterForMeasure(poster);
    void poster.offsetWidth;

    const baseWidth = CART_SQUARE_PREVIEW_W;
    const baseHeight = CART_SQUARE_PREVIEW_H;
    const availableWidth = Math.max(
      1,
      (Math.floor(hostRect.width) || sizingHost.clientWidth || 520) - previewPad * 2
    );
    const availableHeight = Math.max(
      1,
      (Math.floor(hostRect.height) || sizingHost.clientHeight || availableWidth) - previewPad * 2
    );
    const scale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight, 1);
    if (!Number.isFinite(scale) || scale <= 0) return;

    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.maxWidth = "100%";
    frame.style.maxHeight = "100%";
    poster.style.transformOrigin = "center center";
    poster.style.transform = `scale(${scale})`;
    return;
  }

  const isSelection = frame.dataset.cartPosterType === "selection-poster";
  if (!isSelection) return;

  const sizingHost = host.closest?.(".cart-preview-content") || host;
  const hostRect = sizingHost.getBoundingClientRect();
  const previewPad = 40;

  prepareCartGalleryPosterForMeasure(poster);
  void poster.offsetWidth;
  syncCartGalleryPosterMetrics(poster);

  const baseWidth = CART_GALLERY_PREVIEW_W;
  const baseHeight = CART_GALLERY_PREVIEW_H;
  const availableWidth = Math.max(
    1,
    (Math.floor(hostRect.width) || sizingHost.clientWidth || 520) - previewPad * 2
  );
  const availableHeight = Math.max(
    1,
    (Math.floor(hostRect.height) || sizingHost.clientHeight || availableWidth) -
      previewPad * 2
  );
  const scale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight, 1);
  if (!Number.isFinite(scale) || scale <= 0) return;

  frame.style.width = "100%";
  frame.style.height = "100%";
  frame.style.maxWidth = "100%";
  frame.style.maxHeight = "100%";
  poster.style.transformOrigin = "center center";
  poster.style.transform = `scale(${scale})`;
}

function teardownCartModalPreview(content) {
  _cartModalPreviewGen += 1;
  clearTimeout(_cartModalPreviewImgTimer);
  clearTimeout(_cartModalPreviewUpgradeTimer);
  _cartModalPreviewImgTimer = 0;
  _cartModalPreviewUpgradeTimer = 0;
  if (!content) return;

  if (content._mppCartModalImgHandler) {
    content.removeEventListener("load", content._mppCartModalImgHandler, true);
    content._mppCartModalImgHandler = null;
  }

  const host = content.querySelector(".cart-poster-preview-host");
  if (host?._mppCartQuizPreviewRO) {
    host._mppCartQuizPreviewRO.disconnect();
    host._mppCartQuizPreviewRO = null;
  }

  const frame = content.querySelector(".cart-live-poster-frame");
  if (frame?._mppCartPosterRO) {
    frame._mppCartPosterRO.disconnect();
    frame._mppCartPosterRO = null;
  }
}

function upgradeCartModalFilmImage(img) {
  const fullSrc = img.dataset.cartFullSrc || "";
  if (!fullSrc || img.dataset.cartFullUpgraded === "1" || img.src === fullSrc) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const loader = new Image();
    loader.decoding = "async";
    const finish = (ok) => {
      if (ok && img.isConnected) {
        img.src = fullSrc;
        img.dataset.cartFullUpgraded = "1";
        delete img.dataset.cartFullSrc;
        delete img.dataset.fallbackSrc;
      }
      resolve(ok);
    };
    loader.onload = () => finish(true);
    loader.onerror = () => finish(false);
    loader.src = fullSrc;
  });
}

function startCartModalFullResUpgrade(content, onSync) {
  const gen = _cartModalPreviewGen;
  const filmImgs = [...content.querySelectorAll(".poster-film > img[data-cart-full-src]")];
  if (!filmImgs.length) return;

  const runSync = () => {
    if (gen !== _cartModalPreviewGen || !content.isConnected) return;
    onSync();
  };

  const startUpgrade = () => {
    if (gen !== _cartModalPreviewGen) return;
    let index = 0;

    const step = () => {
      if (gen !== _cartModalPreviewGen || !content.isConnected) return;
      const batch = filmImgs.slice(index, index + CART_MODAL_UPGRADE_BATCH);
      index += CART_MODAL_UPGRADE_BATCH;
      if (!batch.length) return;

      Promise.all(batch.map(upgradeCartModalFilmImage)).then(() => {
        runSync();
        if (index < filmImgs.length) {
          _cartModalPreviewUpgradeTimer = window.setTimeout(step, 0);
          return;
        }
        const poster = content.querySelector(".poster-sheet");
        if (poster && !content.querySelector(".poster-film > img[data-cart-full-src]")) {
          poster.dataset.cartModalImageTier = "full";
        }
      });
    };

    step();
  };

  const idle = window.requestIdleCallback;
  if (typeof idle === "function") idle(startUpgrade, { timeout: 1200 });
  else window.setTimeout(startUpgrade, 80);
}

function scheduleCartModalPreview(content, syncFn) {
  const run = () =>
    requestAnimationFrame(() => {
      if (!content.isConnected) return;
      syncFn();
    });

  if (document.fonts?.ready) document.fonts.ready.then(run);
  else run();

  if (!content._mppCartModalImgHandler) {
    const onImgProgress = () => {
      clearTimeout(_cartModalPreviewImgTimer);
      _cartModalPreviewImgTimer = window.setTimeout(run, 120);
    };
    content.addEventListener("load", onImgProgress, true);
    content._mppCartModalImgHandler = onImgProgress;
  }

  const sizingEl = content.closest(".cart-preview-content") || content;
  const host = content.querySelector(".cart-poster-preview-host");
  const frame = content.querySelector(".cart-live-poster-frame");

  if (host) {
    const poster = host.querySelector(".poster-sheet");
    if (host._mppCartQuizPreviewRO) host._mppCartQuizPreviewRO.disconnect();
    if (sizingEl && typeof ResizeObserver !== "undefined" && poster) {
      host._mppCartQuizPreviewRO = new ResizeObserver(run);
      host._mppCartQuizPreviewRO.observe(sizingEl);
    }
    startCartModalFullResUpgrade(content, () => syncCartQuizModalPreview(host, poster));
    return;
  }

  if (frame) {
    if (frame._mppCartPosterRO) frame._mppCartPosterRO.disconnect();
    if (sizingEl && typeof ResizeObserver !== "undefined") {
      frame._mppCartPosterRO = new ResizeObserver(run);
      frame._mppCartPosterRO.observe(sizingEl);
    }
    startCartModalFullResUpgrade(content, () => syncCartLivePosterFrame(frame));
  }
}

/** Modal Mon Poster — même moteur que « Visualiser le poster » sur mon-poster.html. */
function syncCartQuizModalPreview(host, poster) {
  const api = window.MppPosterPreviewHost;
  if (!api || !host || !poster) return;

  host.style.removeProperty("width");
  host.style.removeProperty("height");
  api.preparePosterSheetForA2Measure(poster);
  void poster.offsetWidth;
  api.syncPosterSheetLayoutMetrics(poster);
  void poster.offsetWidth;
  api.sizePosterSheetInHost(poster, host, {
    sizingEl: host.closest(".cart-preview-content"),
    fallbackWidth: api.POSTER_A2_FALLBACK_W,
    fallbackHeight: api.POSTER_A2_FALLBACK_H,
    maxFitScale: 0.72,
    horizontalPad: 48,
    verticalPad: 56,
    transformOrigin: "top left",
  });
}

function syncCartLivePosterFrame(frame) {
  sizeCartLivePosterFrame(frame);
}

/** Vignette panier — vitrine inchangée ; Mon Poster = même gabarit 340px + scale. */
function sizeCartThumbnailPosterFrame(frame) {
  const poster = frame.firstElementChild;
  const host = frame.parentElement;
  if (!poster || !host) return;

  const posterType = frame.dataset.cartPosterType || "quiz-poster";

  if (
    posterType === "square-frame-poster" &&
    poster.classList.contains("mpp-square-frame-poster")
  ) {
    sizeCartThumbSquarePosterFrame(frame, poster);
    return;
  }

  if (posterType === "selection-poster" && isCartGalleryStylePoster(poster)) {
    sizeCartThumbFixedPreviewFrame(
      frame,
      poster,
      host,
      prepareCartGalleryPosterForMeasure,
      syncCartThumbPosterMetrics
    );
    return;
  }

  if (posterType === "quiz-poster" && poster.classList.contains("poster-sheet")) {
    sizeCartThumbFixedPreviewFrame(
      frame,
      poster,
      host,
      prepareCartQuizPosterForMeasure,
      syncCartThumbPosterMetrics
    );
  }
}

function syncCartThumbnailPosterFrame(frame) {
  sizeCartThumbnailPosterFrame(frame);
}

function openCartPreview(item) {
  const modal = document.getElementById("cartPreviewModal");
  const content = document.getElementById("cartPreviewContent");
  if (!modal || !content) return;

  teardownCartModalPreview(content);
  content.innerHTML = "";
  modal.hidden = false;
  const previewFrame = document.createElement("div");
  previewFrame.className = "cart-preview-watermark-frame";
  const modalPreviewOptions = getCartModalPreviewOptions();

  if (item.type === "quiz-poster") {
    const host = document.createElement("div");
    host.className = "cart-poster-preview-host";
    const poster = createCartQuizPosterPreview(item, modalPreviewOptions);
    poster.classList.add("poster-large-preview-clone");
    poster.dataset.cartModalImageTier = "thumb";
    host.appendChild(poster);
    previewFrame.appendChild(host);
    content.appendChild(previewFrame);
    const syncQuiz = () => syncCartQuizModalPreview(host, poster);
    scheduleCartModalPreview(content, syncQuiz);
    requestAnimationFrame(syncQuiz);
  } else {
    const livePreview = createCartPosterPreview(item, "modal");
    const poster = livePreview.firstElementChild;
    if (poster) poster.dataset.cartModalImageTier = "thumb";
    previewFrame.appendChild(livePreview);
    content.appendChild(previewFrame);
    const syncLive = () => syncCartLivePosterFrame(livePreview);
    scheduleCartModalPreview(content, syncLive);
    requestAnimationFrame(syncLive);
  }

  protectCartImagesIn(content);
  window.removeEventListener("resize", onCartPreviewWindowResize);
  window.addEventListener("resize", onCartPreviewWindowResize);
  document.getElementById("cartPreviewClose")?.focus();
}

function closeCartPreview() {
  window.removeEventListener("resize", onCartPreviewWindowResize);
  clearTimeout(_mppCartPreviewResizeTimer);
  _mppCartPreviewResizeTimer = 0;

  const modal = document.getElementById("cartPreviewModal");
  const content = document.getElementById("cartPreviewContent");
  teardownCartModalPreview(content);
  if (modal) modal.hidden = true;
}

function createCartItem(item, index) {
  const article = document.createElement("article");
  article.className = "cart-item";

  const preview = document.createElement("div");
  preview.className = "cart-item-preview";
  preview.classList.add("cart-item-preview--live");
  preview.appendChild(createCartPosterPreview(item, "thumbnail"));

  const details = document.createElement("div");
  details.className = "cart-item-details";

  const eyebrow = document.createElement("p");
  eyebrow.className = "cart-item-eyebrow";
  eyebrow.textContent =
    item.type === "quiz-poster"
      ? "Mon Poster"
      : item.type === "square-frame-poster"
        ? "Affiche encadrée"
        : "Sélection vitrine";

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
  teardownCartThumbObservers();
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
  protectCartImagesIn(root);
  scheduleCartThumbPipelineStart(root);
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
