// =====================
// POSTER : génération, métriques, aperçu, éditeur
// (références DOM et constantes : globals mpp-dom / mpp-defaults)
// =====================

var posterLayoutFrame = 0;
var posterCustomizePreviewFrame = 0;
var posterCustomizePreviewNeedsRefresh = false;
var posterCustomizePreviewZoom = 1;
var posterLargePreviewZoom = 1;

function schedulePosterLayoutMetrics() {
  if (posterLayoutFrame) return;
  posterLayoutFrame = requestAnimationFrame(() => {
    posterLayoutFrame = 0;
    syncPosterLayoutMetrics();
    schedulePosterCustomizePreview();
  });
}

function sizePosterCustomizePreviewClone(clone) {
  const preview = document.getElementById("posterCustomizePreview");
  if (!preview || !clone || !poster) return;

  const frame = preview.closest(".customize-live-preview");
  const baseWidth = poster.offsetWidth || 1587;
  const baseHeight = poster.offsetHeight || 2245;
  const availableWidth = Math.max(240, (frame?.clientWidth || 560) - 36);
  const zoomControls = document.querySelector(".poster-preview-zoom-controls");
  const availableHeight = Math.max(
    320,
    (frame?.clientHeight || window.innerHeight * 0.78) - 48 - (zoomControls?.offsetHeight || 0)
  );
  const fitScale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight, 0.42);
  const scale = fitScale * posterCustomizePreviewZoom;

  preview.style.width = `${Math.ceil(baseWidth * scale)}px`;
  preview.style.height = `${Math.ceil(baseHeight * scale)}px`;
  preview.style.maxWidth = "none";
  preview.style.maxHeight = "none";
  clone.style.transform = `scale(${scale})`;
}

function updatePosterCustomizeZoomControls() {
  const value = document.getElementById("posterPreviewZoomValue");
  if (value) value.textContent = `${Math.round(posterCustomizePreviewZoom * 100)}%`;
}

function setPosterCustomizePreviewZoom(nextZoom) {
  posterCustomizePreviewZoom = Math.min(2, Math.max(0.6, nextZoom));
  updatePosterCustomizeZoomControls();
  schedulePosterCustomizePreview();
}

function updatePosterLargePreviewZoomControls() {
  const value = document.getElementById("posterLargePreviewZoomValue");
  if (value) value.textContent = `${Math.round(posterLargePreviewZoom * 100)}%`;
}

function setPosterLargePreviewZoom(nextZoom) {
  posterLargePreviewZoom = Math.min(2.4, Math.max(0.6, nextZoom));
  updatePosterLargePreviewZoomControls();
  requestAnimationFrame(refreshPosterLargePreview);
}

function syncPosterCustomizePreview() {
  const modal = document.getElementById("posterCustomizeModal");
  const preview = document.getElementById("posterCustomizePreview");
  const clone = preview?.querySelector(".customize-live-poster-clone");
  if (!modal || modal.hidden || !preview || !poster || poster.style.display === "none") return;
  if (!clone) {
    refreshPosterCustomizePreview();
    return;
  }

  clone.className = poster.className;
  clone.classList.add("customize-live-poster-clone");
  clone.style.cssText = poster.style.cssText;
  ["data-band-synced"].forEach((name) => {
    if (poster.hasAttribute(name)) clone.setAttribute(name, poster.getAttribute(name));
    else clone.removeAttribute(name);
  });

  [".poster-title", ".poster-subtitle"].forEach((selector) => {
    const source = poster.querySelector(selector);
    const target = clone.querySelector(selector);
    if (!source || !target) return;
    target.textContent = source.textContent;
    target.className = source.className;
    target.style.cssText = source.style.cssText;
  });

  const sourceCircles = poster.querySelectorAll(".film-circle");
  const targetCircles = clone.querySelectorAll(".film-circle");
  sourceCircles.forEach((source, index) => {
    const target = targetCircles[index];
    if (target && target.src !== source.src) target.src = source.src;
  });

  sizePosterCustomizePreviewClone(clone);
}

function refreshPosterCustomizePreview() {
  const modal = document.getElementById("posterCustomizeModal");
  const preview = document.getElementById("posterCustomizePreview");
  if (!modal || modal.hidden || !preview || !poster || poster.style.display === "none") return;

  preview.innerHTML = "";
  const clone = poster.cloneNode(true);
  stripIdsFromElement(clone);
  clone.classList.add("customize-live-poster-clone");
  preview.appendChild(clone);
  sizePosterCustomizePreviewClone(clone);
}

function schedulePosterCustomizePreview(options = {}) {
  if (options.refresh) posterCustomizePreviewNeedsRefresh = true;
  if (posterCustomizePreviewFrame) return;
  posterCustomizePreviewFrame = requestAnimationFrame(() => {
    posterCustomizePreviewFrame = 0;
    const shouldRefresh = posterCustomizePreviewNeedsRefresh;
    posterCustomizePreviewNeedsRefresh = false;
    if (shouldRefresh) refreshPosterCustomizePreview();
    else syncPosterCustomizePreview();
  });
}

function openPosterCustomizer() {
  const modal = document.getElementById("posterCustomizeModal");
  if (!modal) return;
  posterTextCustomizer?.writeControls();
  updatePosterCustomizeZoomControls();
  modal.hidden = false;
  schedulePosterCustomizePreview({ refresh: true });
  document.getElementById("titleEditorInput")?.focus();
}

function closePosterCustomizer() {
  const modal = document.getElementById("posterCustomizeModal");
  if (modal) modal.hidden = true;
  const preview = document.getElementById("posterCustomizePreview");
  if (preview) preview.innerHTML = "";
}

function isPosterCustomizerEventInsideCard(event, card) {
  if (!card) return false;
  if (typeof event.composedPath === "function") {
    return event.composedPath().includes(card);
  }
  return event.target instanceof Node && card.contains(event.target);
}

function resolvePosterAssetSrc(src) {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return src || "";
  try {
    return new URL(encodeURI(src), document.baseURI).href;
  } catch (error) {
    return src;
  }
}

function getPosterThumbnailSrc(src) {
  if (!src || src.includes("/thumbs/")) return src || "";
  return src.replace(/(^|\/)assets\/img\//, "$1assets/img/thumbs/");
}

function generatePoster(films) {
  const grid = document.getElementById("posterGrid");
  const requestedCount = Number(posterCountSelect?.value || 100);
  const allowedCounts = [25, 48, 100];
  const safeCount = allowedCounts.includes(requestedCount) ? requestedCount : 100;

  if (posterPreviewViewport) {
    posterPreviewViewport.dataset.posterLayout = String(safeCount);
  }
  poster.dataset.posterLayout = String(safeCount);

  const layoutByCount = {
    25: { cols: 5, gap: 18 },
    48: { cols: 6, gap: 14 },
    100: { cols: 10, gap: 7 },
  };
  const currentLayout = layoutByCount[safeCount] || layoutByCount[100];
  const cols = currentLayout.cols;
  const filmsToShow = (Array.isArray(films) ? films : [])
    .filter((film) => film?.image)
    .slice(0, safeCount);
  const displayCount = filmsToShow.length;
  const rows = Math.max(1, Math.ceil(displayCount / cols));

  poster.classList.toggle("poster-sheet--fill-movie-grid", safeCount === 48);

  grid.innerHTML = "";
  grid.dataset.layout = String(safeCount);
  grid.style.setProperty("--poster-cols", String(cols));
  grid.style.setProperty("--poster-rows", String(rows));
  grid.style.setProperty("--poster-gap", `${currentLayout.gap}px`);

  const oldHeader = poster.querySelector(".poster-header");
  if (oldHeader) oldHeader.remove();

  const header = document.createElement("div");
  header.className = "poster-header";

  const title = document.createElement("div");
  title.className = "poster-title";
  title.id = "posterTitle";
  title.textContent = titleEditorInput.value.trim() || DEFAULT_TITLE;

  const subtitle = document.createElement("div");
  subtitle.className = "poster-subtitle";
  subtitle.id = "posterSubtitle";
  subtitle.textContent = subtitleEditorInput.value.trim() || DEFAULT_SUBTITLE;

  header.appendChild(title);
  header.appendChild(subtitle);

  poster.insertBefore(header, grid);
  applyPosterTypographyFromEditor();
  applyTitleSubtitleFormatClasses();

  const remainder = displayCount % cols;
  const mainCount = remainder === 0 ? displayCount : displayCount - remainder;
  const shouldAnimateCards = safeCount < 100;

  function appendFilmCard(f, i, parent) {
    if (!f?.image) return null;

    const card = document.createElement("div");
    card.className = "poster-film";
    if (shouldAnimateCards) {
      card.classList.add("poster-film--entering");
      card.style.setProperty("--poster-film-delay", `${i * 28}ms`);
    }

    const img = document.createElement("img");
    const originalImageSrc = resolvePosterAssetSrc(f.image);
    const preferredImageSrc = resolvePosterAssetSrc(
      safeCount === 100 ? getPosterThumbnailSrc(f.image) : f.image
    );
    img.src = preferredImageSrc;
    if (preferredImageSrc !== originalImageSrc) {
      img.dataset.fallbackSrc = originalImageSrc;
    }
    img.alt = "";
    img.decoding = "async";
    img.loading = "eager";
    img.addEventListener(
      "error",
      () => {
        if (img.dataset.fallbackSrc) {
          img.src = img.dataset.fallbackSrc;
          delete img.dataset.fallbackSrc;
          return;
        }
        card.classList.add("poster-film--image-error");
        console.warn("Image poster introuvable ou non décodable :", f.image);
      },
      { passive: true }
    );
    protectImageElement(img);

    const info = document.createElement("div");
    info.className = "film-info";

    const titleEl = document.createElement("div");
    titleEl.className = "film-title";
    titleEl.textContent = f.titre;
    titleEl.title = f.titre;

    const yearEl = document.createElement("div");
    yearEl.className = "film-year";
    yearEl.textContent = f.year || "";

    const circle = document.createElement("img");
    circle.className = "film-circle";
    circle.src = resolvePosterAssetSrc(
      posterTextCustomizer?.getState()?.filmCircleSrc || "./assets/site/circle.png"
    );
    circle.alt = "";
    circle.decoding = "async";
    circle.loading = "eager";
    protectImageElement(circle);

    info.appendChild(circle);
    info.appendChild(titleEl);
    info.appendChild(yearEl);
    card.appendChild(img);
    card.appendChild(info);

    parent.appendChild(card);
    return card;
  }

  const gridFragment = document.createDocumentFragment();
  for (let i = 0; i < mainCount; i++) {
    appendFilmCard(filmsToShow[i], i, gridFragment);
  }
  grid.appendChild(gridFragment);

  if (remainder > 0) {
    const tail = document.createElement("div");
    tail.className = "poster-grid-tail";
    tail.style.setProperty("--poster-tail-count", String(remainder));
    const tailFragment = document.createDocumentFragment();
    for (let j = 0; j < remainder; j++) {
      const i = mainCount + j;
      appendFilmCard(filmsToShow[i], i, tailFragment);
    }
    tail.appendChild(tailFragment);
    grid.appendChild(tail);
  }

  schedulePosterLayoutMetrics();
  schedulePosterCustomizePreview({ refresh: true });
  grid.querySelectorAll(".poster-film > img").forEach((imgEl) => {
    if (!imgEl.complete) {
      imgEl.addEventListener("load", schedulePosterLayoutMetrics, { passive: true, once: true });
    }
  });

  const footerLogo = poster.querySelector(".poster-footer-logo");
  if (footerLogo && !footerLogo.complete) {
    footerLogo.addEventListener("load", schedulePosterLayoutMetrics, {
      passive: true,
      once: true,
    });
  }
}

function collectPosterFilmCards(grid) {
  return [
    ...grid.querySelectorAll(":scope > .poster-film"),
    ...grid.querySelectorAll(":scope > .poster-grid-tail .poster-film"),
  ];
}

function collectPosterFilmCardsForBandHeight(grid) {
  const layout = grid.dataset.layout;
  const main = [...grid.querySelectorAll(":scope > .poster-film")];
  if (layout === "100" && main.length > 0) {
    return main;
  }
  return collectPosterFilmCards(grid);
}

function syncPosterHeaderFooterBandHeight(measuredCards) {
  const posterEl = document.getElementById("posterContainer");
  if (!posterEl) return;
  posterEl.style.removeProperty("--poster-band-height");
  posterEl.removeAttribute("data-band-synced");
}

function syncPosterLayoutMetrics() {
  fitPosterFilmTitles();
  syncPosterPreviewSlotSize();
}

function readCssNumber(el, propertyName, fallback) {
  const raw = getComputedStyle(el).getPropertyValue(propertyName);
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function fitPosterFilmTitle(titleEl) {
  if (!titleEl || titleEl.clientWidth < 1 || titleEl.clientHeight < 1) return;
  const fitKey = `${Math.round(titleEl.clientWidth)}x${Math.round(titleEl.clientHeight)}`;
  if (titleEl.dataset.fitKey === fitKey) return;

  const computed = getComputedStyle(titleEl);
  const currentFontSize = parseFloat(computed.fontSize) || 10;
  const maxSize = readCssNumber(titleEl, "--film-title-max-size", currentFontSize);
  const minSize = readCssNumber(titleEl, "--film-title-min-size", Math.max(5, maxSize * 0.45));

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

function fitPosterFilmTitles() {
  const grid = document.getElementById("posterGrid");
  if (!grid || posterWorkspace.style.display === "none") return;

  grid.querySelectorAll(".film-title").forEach(fitPosterFilmTitle);
}

function syncPosterPreviewSlotSize() {
  const stage = document.querySelector(".poster-preview-stage");
  const slot = posterPreviewScaleSlot;
  if (!stage || !slot || posterWorkspace.style.display === "none") return;

  const rect = stage.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  if (w < 1 || h < 1) return;

  slot.style.width = `${Math.round(w * 100) / 100}px`;
  slot.style.height = `${Math.round(h * 100) / 100}px`;
}

function setupPosterPreviewLayoutSync() {
  const posterEl = document.getElementById("posterContainer");
  if (!posterEl || typeof ResizeObserver === "undefined") return;

  const ro = new ResizeObserver(() => {
    schedulePosterLayoutMetrics();
  });
  ro.observe(posterEl);

  window.addEventListener("resize", () => {
    schedulePosterLayoutMetrics();
  });
}

function stripIdsFromElement(root) {
  root.removeAttribute("id");
  root.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
}

function sizePosterLargePreviewClone(clone) {
  const modal = document.getElementById("posterLargePreviewModal");
  const content = document.getElementById("posterLargePreviewContent");
  const posterEl = document.getElementById("posterContainer");
  if (!modal || !content || !posterEl || !clone) return;

  const card = modal.querySelector(".poster-large-preview-card");
  const baseWidth = posterEl.offsetWidth || 1587;
  const baseHeight = posterEl.offsetHeight || 2245;
  const availableWidth = Math.max(280, (card?.clientWidth || window.innerWidth * 0.92) - 56);
  const zoomControls = modal.querySelector(".poster-large-preview-zoom-controls");
  const availableHeight = Math.max(
    360,
    (card?.clientHeight || window.innerHeight * 0.9) - 70 - (zoomControls?.offsetHeight || 0)
  );
  const fitScale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight, 0.72);
  const scale = fitScale * posterLargePreviewZoom;

  content.style.width = `${Math.ceil(baseWidth * scale)}px`;
  content.style.height = `${Math.ceil(baseHeight * scale)}px`;
  content.style.maxWidth = "none";
  content.style.maxHeight = "none";
  clone.style.transform = `scale(${scale})`;
}

function refreshPosterLargePreview() {
  const modal = document.getElementById("posterLargePreviewModal");
  const content = document.getElementById("posterLargePreviewContent");
  const posterEl = document.getElementById("posterContainer");
  if (!modal || modal.hidden || !content || !posterEl || posterEl.style.display === "none") return;

  let clone = content.querySelector(".poster-large-preview-clone");
  if (!clone) {
    content.innerHTML = "";
    clone = posterEl.cloneNode(true);
    stripIdsFromElement(clone);
    clone.classList.add("poster-large-preview-clone");
    content.appendChild(clone);
  }

  sizePosterLargePreviewClone(clone);
}

function openPosterLargePreview() {
  const modal = document.getElementById("posterLargePreviewModal");
  if (!modal) return;
  modal.hidden = false;
  updatePosterLargePreviewZoomControls();
  requestAnimationFrame(refreshPosterLargePreview);
  document.getElementById("posterLargePreviewClose")?.focus();
}

function closePosterLargePreview() {
  const modal = document.getElementById("posterLargePreviewModal");
  if (modal) modal.hidden = true;
  const content = document.getElementById("posterLargePreviewContent");
  if (content) content.innerHTML = "";
}

var posterTextCustomizer = null;

function syncPosterTextCustomization() {
  posterTextCustomizer?.apply();
}

function syncPosterFormatToolbar() {
  posterTextCustomizer?.syncToolbar();
}

function applyTitleSubtitleFormatClasses() {
  syncPosterTextCustomization();
}

function syncPosterFontSizeLabels() {
  posterTextCustomizer?.syncLabels();
}

function applyPosterTypographyFromEditor() {
  syncPosterTextCustomization();
}

async function addPosterToCart() {
  const requestedCount = Number(posterCountSelect?.value || 100);
  const allowedCounts = [25, 48, 100];
  const safeCount = allowedCounts.includes(requestedCount) ? requestedCount : 100;
  const filmsToShow = currentFilms.filter((film) => film?.image).slice(0, safeCount);

  if (!filmsToShow.length) return;

  const cartItem = {
    type: "quiz-poster",
    addedAt: new Date().toISOString(),
    customization: posterTextCustomizer?.getState() || {},
    layoutCount: safeCount,
    films: filmsToShow.map((film) => ({
      titre: film.titre,
      year: film.year,
      image: film.image,
    })),
  };

  setPosterCartFeedback("Ajout au panier...");

  try {
    const existingCart = JSON.parse(localStorage.getItem("mppCart") || "[]");
    existingCart.push(cartItem);
    localStorage.setItem("mppCart", JSON.stringify(existingCart));
    window.updateMppCartIndicator?.();
  } catch (error) {
    console.warn("Impossible d'enregistrer le panier local.", error);
  }

  setPosterCartFeedback("Poster ajouté au panier.");
}

function setPosterCartFeedback(message) {
  document.querySelectorAll(".poster-cart-feedback").forEach((feedback) => {
    feedback.textContent = message;
  });
}

function applyPosterCountSelection(value) {
  const allowedCounts = ["25", "48", "100"];
  const safeValue = allowedCounts.includes(String(value)) ? String(value) : "100";
  if (posterCountSelect) posterCountSelect.value = safeValue;
  if (posterSideCountSelect) posterSideCountSelect.value = safeValue;
  if (posterWorkspace.style.display !== "none" && currentFilms.length > 0) {
    generatePoster(currentFilms);
  }
}

function bindPosterEditor() {
  posterTextCustomizer = MppTextCustomizer.create({
    defaults: {
      title: DEFAULT_TITLE,
      subtitle: DEFAULT_SUBTITLE,
      titleFont: titleFontSelect?.value || "",
      subtitleFont: subtitleFontSelect?.value || "",
      titleSize: DEFAULT_TITLE_FONT_SIZE_PX,
      subtitleSize: DEFAULT_SUBTITLE_FONT_SIZE_PX,
      titleColor: DEFAULT_TITLE_COLOR,
      subtitleColor: DEFAULT_SUBTITLE_COLOR,
      filmTitleColor: "#31343c",
      filmYearColor: "#5c606b",
      filmCircleSrc: "./assets/site/circle.png",
      backgroundImage: "",
    },
    controls: {
      titleInput: titleEditorInput,
      subtitleInput: subtitleEditorInput,
      titleFontSelect,
      subtitleFontSelect,
      titleSizeInput: titleFontSizeInput,
      subtitleSizeInput: subtitleFontSizeInput,
      titleSizeLabel: titleFontSizeValue,
      subtitleSizeLabel: subtitleFontSizeValue,
      titleColorInput,
      subtitleColorInput,
      filmTitleColorInput,
      filmYearColorInput,
      filmCircleSelect,
      backgroundSelect: "posterBackgroundSelect",
      backgroundUpload: "posterBackgroundUpload",
      resetButton: resetPosterTextBtn,
      formatButtons: {
        title: TITLE_FMT_BTN,
        subtitle: SUBTITLE_FMT_BTN,
      },
    },
    targets: {
      mode: "cssVars",
      root: () => document.getElementById("posterContainer"),
      title: () => document.getElementById("posterTitle"),
      subtitle: () => document.getElementById("posterSubtitle"),
    },
    onChange: () => {
      schedulePosterCustomizePreview();
    },
  });

  posterTextCustomizer.bind();
  posterTextCustomizer.writeControls();
  if (posterSideCountSelect && posterCountSelect) {
    posterSideCountSelect.value = posterCountSelect.value;
  }

  posterCountSelect.addEventListener("change", () => {
    applyPosterCountSelection(posterCountSelect.value);
  });
  posterSideCountSelect?.addEventListener("change", () => {
    applyPosterCountSelection(posterSideCountSelect.value);
  });
  document.getElementById("posterCustomizeOpen")?.addEventListener("click", openPosterCustomizer);
  document.getElementById("posterCustomizeClose")?.addEventListener("click", closePosterCustomizer);
  const posterCustomizeModal = document.getElementById("posterCustomizeModal");
  const posterCustomizeCard = document.getElementById("posterCustomizeCard");
  posterCustomizeModal?.addEventListener("pointerdown", (event) => {
    if (isPosterCustomizerEventInsideCard(event, posterCustomizeCard)) return;
    closePosterCustomizer();
  });
  document.getElementById("posterPreviewOpen")?.addEventListener("click", openPosterLargePreview);
  document.getElementById("posterLargePreviewClose")?.addEventListener("click", closePosterLargePreview);
  const posterLargePreviewModal = document.getElementById("posterLargePreviewModal");
  posterLargePreviewModal?.querySelector(".poster-large-preview-card")?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  posterLargePreviewModal?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closePosterLargePreview();
  });
  window.addEventListener("resize", refreshPosterLargePreview);
  document.getElementById("posterLargePreviewZoomOut")?.addEventListener("click", () => {
    setPosterLargePreviewZoom(posterLargePreviewZoom - 0.2);
  });
  document.getElementById("posterLargePreviewZoomIn")?.addEventListener("click", () => {
    setPosterLargePreviewZoom(posterLargePreviewZoom + 0.2);
  });
  document.getElementById("posterLargePreviewZoomReset")?.addEventListener("click", () => {
    setPosterLargePreviewZoom(1);
  });
  document.getElementById("posterCustomizeValidate")?.addEventListener("click", closePosterCustomizer);
  document.getElementById("posterSideAddToCart")?.addEventListener("click", addPosterToCart);
  document.getElementById("posterPreviewZoomOut")?.addEventListener("click", () => {
    setPosterCustomizePreviewZoom(posterCustomizePreviewZoom - 0.2);
  });
  document.getElementById("posterPreviewZoomIn")?.addEventListener("click", () => {
    setPosterCustomizePreviewZoom(posterCustomizePreviewZoom + 0.2);
  });
  document.getElementById("posterPreviewZoomReset")?.addEventListener("click", () => {
    setPosterCustomizePreviewZoom(1);
  });
  updatePosterCustomizeZoomControls();
  updatePosterLargePreviewZoomControls();

  syncPosterFormatToolbar();
  syncPosterFontSizeLabels();
}

bindPosterEditor();
setupPosterPreviewLayoutSync();
