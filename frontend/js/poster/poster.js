// =====================
// POSTER : génération, métriques, loupe, éditeur
// (références DOM et constantes : globals mpp-dom / mpp-defaults)
// =====================

var posterLayoutFrame = 0;

function schedulePosterLayoutMetrics() {
  if (posterLayoutFrame) return;
  posterLayoutFrame = requestAnimationFrame(() => {
    posterLayoutFrame = 0;
    syncPosterLayoutMetrics();
  });
}

function generatePoster(films) {
  const grid = document.getElementById("posterGrid");
  const requestedCount = Number(posterCountSelect?.value || 100);
  const allowedCounts = [25, 48, 100];
  const safeCount = allowedCounts.includes(requestedCount) ? requestedCount : 100;

  if (posterPreviewViewport) {
    posterPreviewViewport.dataset.posterLayout = String(safeCount);
  }
  if (safeCount !== 100 && posterMagnifier) {
    posterMagnifier.hidden = true;
    posterMagnifier.setAttribute("aria-hidden", "true");
    const magInner = posterMagnifier.querySelector(".poster-magnifier-inner");
    if (magInner) magInner.innerHTML = "";
  }

  const layoutByCount = {
    25: { cols: 5, gap: 8 },
    48: { cols: 6, gap: 12 },
    100: { cols: 8, gap: 10 },
  };
  const currentLayout = layoutByCount[safeCount] || layoutByCount[100];
  const cols = currentLayout.cols;
  const rows = Math.ceil(safeCount / cols);

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

  const filmsToShow = films.slice(0, safeCount);
  const remainder = safeCount % cols;
  const mainCount = remainder === 0 ? safeCount : safeCount - remainder;

  function appendFilmCard(f, i, parent) {
    const card = document.createElement("div");
    card.className = "poster-film poster-film--entering";
    card.style.setProperty("--poster-film-delay", `${i * 28}ms`);

    const img = document.createElement("img");
    img.src = f.image;
    img.alt = "";
    img.decoding = "async";
    protectImageElement(img);

    const info = document.createElement("div");
    info.className = "film-info";

    const titleEl = document.createElement("div");
    titleEl.className = "film-title";
    titleEl.textContent = f.titre;
    titleEl.title = f.titre;
    info.appendChild(titleEl);

    const yearEl = document.createElement("div");
    yearEl.className = "film-year";
    yearEl.textContent = f.year || "";
    info.appendChild(yearEl);

    const circle = document.createElement("img");
    circle.className = "film-circle";
    circle.src = "./assets/site/circle.png";
    circle.alt = "";
    circle.decoding = "async";
    protectImageElement(circle);

    info.appendChild(circle);
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

  scheduleMagnifierCloneRefresh();
  schedulePosterLayoutMetrics();
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

  syncPosterZoomToggleUI();
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
  const grid = document.getElementById("posterGrid");
  if (!posterEl || !grid || posterWorkspace.style.display === "none") return;

  const cards = measuredCards || collectPosterFilmCardsForBandHeight(grid);
  if (!cards.length) {
    posterEl.style.removeProperty("--poster-band-height");
    posterEl.removeAttribute("data-band-synced");
    return;
  }

  let prevApplied = -2;
  for (let step = 0; step < 12; step++) {
    let maxH = 0;
    for (const el of cards) {
      maxH = Math.max(maxH, el.offsetHeight);
    }
    if (maxH < 8) return;

    const rounded = Math.round(maxH);
    if (rounded === prevApplied) break;
    prevApplied = rounded;

    posterEl.style.setProperty("--poster-band-height", `${rounded}px`);
    posterEl.dataset.bandSynced = "true";
    void posterEl.offsetHeight;
  }
}

function syncPosterLayoutMetrics() {
  const grid = document.getElementById("posterGrid");
  const cards = grid ? collectPosterFilmCardsForBandHeight(grid) : [];
  syncPosterHeaderFooterBandHeight(cards);
  fitPosterFilmTitles();
  syncPosterHeaderFooterBandHeight(cards);
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

var magnifierCloneTimer = 0;

function stripIdsFromElement(root) {
  root.removeAttribute("id");
  root.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
}

function refreshPosterMagnifierClone() {
  const inner = posterMagnifier?.querySelector(".poster-magnifier-inner");
  const posterEl = document.getElementById("posterContainer");
  if (!inner || !posterEl || posterWorkspace.style.display === "none") return;
  if (posterEl.style.display === "none") return;
  if (posterPreviewViewport?.dataset.posterLayout !== "100") {
    inner.innerHTML = "";
    return;
  }
  if (!posterMagnifierEnabled) {
    inner.innerHTML = "";
    return;
  }

  inner.innerHTML = "";
  const clone = posterEl.cloneNode(true);
  stripIdsFromElement(clone);
  clone.classList.add("poster-magnifier-clone");
  inner.appendChild(clone);

  const w = posterEl.offsetWidth;
  const h = posterEl.offsetHeight;
  clone.style.width = `${w}px`;
  clone.style.height = `${h}px`;
}

function scheduleMagnifierCloneRefresh() {
  clearTimeout(magnifierCloneTimer);
  if (posterPreviewViewport?.dataset.posterLayout !== "100") {
    const inner = posterMagnifier?.querySelector(".poster-magnifier-inner");
    if (inner) inner.innerHTML = "";
    if (posterMagnifier) {
      posterMagnifier.hidden = true;
      posterMagnifier.setAttribute("aria-hidden", "true");
    }
    schedulePosterLayoutMetrics();
    return;
  }
  if (!posterMagnifierEnabled) {
    const innerOff = posterMagnifier?.querySelector(".poster-magnifier-inner");
    if (innerOff) innerOff.innerHTML = "";
    if (posterMagnifier) {
      posterMagnifier.hidden = true;
      posterMagnifier.setAttribute("aria-hidden", "true");
    }
    schedulePosterLayoutMetrics();
    return;
  }
  magnifierCloneTimer = setTimeout(() => {
    refreshPosterMagnifierClone();
    schedulePosterLayoutMetrics();
  }, 500);
}

function readMagnifierLensSize() {
  if (!posterPreviewViewport) return 132;
  const raw = getComputedStyle(posterPreviewViewport).getPropertyValue(
    "--poster-magnifier-size"
  );
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 132;
}

function readMagnifierZoom() {
  if (!posterPreviewViewport) return 2.25;
  const raw = getComputedStyle(posterPreviewViewport).getPropertyValue(
    "--poster-magnifier-zoom"
  );
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 2.25;
}

function syncPosterZoomToggleUI() {
  if (!posterZoomToggle || !posterPreviewViewport) return;
  const is100 = posterPreviewViewport.dataset.posterLayout === "100";
  if (!is100) {
    posterMagnifierEnabled = false;
    posterZoomToggle.disabled = true;
    posterZoomToggle.setAttribute("aria-pressed", "false");
    posterZoomToggle.classList.remove("is-active");
    posterZoomToggle.title = "Disponible avec 100 affiches";
    posterPreviewViewport.classList.remove("is-magnifier-active");
    if (posterMagnifier) {
      posterMagnifier.hidden = true;
      posterMagnifier.setAttribute("aria-hidden", "true");
    }
    const inner = posterMagnifier?.querySelector(".poster-magnifier-inner");
    if (inner) inner.innerHTML = "";
    return;
  }
  posterZoomToggle.disabled = false;
  posterZoomToggle.title = posterMagnifierEnabled
    ? "Désactiver la loupe sur l'aperçu"
    : "Activer la loupe sur l'aperçu";
  posterZoomToggle.setAttribute("aria-pressed", String(posterMagnifierEnabled));
  posterZoomToggle.classList.toggle("is-active", posterMagnifierEnabled);
  posterPreviewViewport.classList.toggle("is-magnifier-active", posterMagnifierEnabled);
  if (!posterMagnifierEnabled) {
    const innerOff = posterMagnifier?.querySelector(".poster-magnifier-inner");
    if (innerOff) innerOff.innerHTML = "";
    if (posterMagnifier) {
      posterMagnifier.hidden = true;
      posterMagnifier.setAttribute("aria-hidden", "true");
    }
  }
}

function setupPosterZoomToggle() {
  if (!posterZoomToggle || !posterPreviewViewport) return;
  posterZoomToggle.addEventListener("click", () => {
    if (posterZoomToggle.disabled) return;
    posterMagnifierEnabled = !posterMagnifierEnabled;
    syncPosterZoomToggleUI();
    if (posterMagnifierEnabled) {
      scheduleMagnifierCloneRefresh();
    } else {
      schedulePosterLayoutMetrics();
    }
  });
  syncPosterZoomToggleUI();
}

function setupPosterMagnifier() {
  if (!posterPreviewViewport || !posterMagnifier) return;

  posterPreviewViewport.addEventListener("mousemove", (e) => {
    if (posterWorkspace.style.display === "none") return;
    if (posterPreviewViewport.dataset.posterLayout !== "100") {
      posterMagnifier.hidden = true;
      posterMagnifier.setAttribute("aria-hidden", "true");
      return;
    }
    if (!posterMagnifierEnabled) {
      posterMagnifier.hidden = true;
      posterMagnifier.setAttribute("aria-hidden", "true");
      return;
    }

    const posterEl = document.getElementById("posterContainer");
    const clone = posterMagnifier.querySelector(".poster-magnifier-clone");
    if (!posterEl || posterEl.style.display === "none" || !clone) return;

    const pr = posterEl.getBoundingClientRect();
    if (
      e.clientX < pr.left ||
      e.clientX > pr.right ||
      e.clientY < pr.top ||
      e.clientY > pr.bottom
    ) {
      posterMagnifier.hidden = true;
      posterMagnifier.setAttribute("aria-hidden", "true");
      return;
    }

    const L = readMagnifierLensSize();
    const Z = readMagnifierZoom();
    const vr = posterPreviewViewport.getBoundingClientRect();

    let vx = e.clientX - vr.left;
    let vy = e.clientY - vr.top;
    let left = vx - L / 2;
    let top = vy - L / 2;
    const maxL = Math.max(0, posterPreviewViewport.clientWidth - L);
    const maxT = Math.max(0, posterPreviewViewport.clientHeight - L);
    left = Math.min(Math.max(0, left), maxL);
    top = Math.min(Math.max(0, top), maxT);

    posterMagnifier.style.left = `${left}px`;
    posterMagnifier.style.top = `${top}px`;
    posterMagnifier.hidden = false;
    posterMagnifier.setAttribute("aria-hidden", "false");

    const px = ((e.clientX - pr.left) / pr.width) * posterEl.offsetWidth;
    const py = ((e.clientY - pr.top) / pr.height) * posterEl.offsetHeight;
    const tx = L / 2 - px * Z;
    const ty = L / 2 - py * Z;
    clone.style.transform = `translate(${tx}px, ${ty}px) scale(${Z})`;
  });

  posterPreviewViewport.addEventListener("mouseleave", () => {
    posterMagnifier.hidden = true;
    posterMagnifier.setAttribute("aria-hidden", "true");
  });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(scheduleMagnifierCloneRefresh, 200);
  });
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
  const feedback = document.getElementById("posterCartFeedback");
  const requestedCount = Number(posterCountSelect?.value || 100);
  const allowedCounts = [25, 48, 100];
  const safeCount = allowedCounts.includes(requestedCount) ? requestedCount : 100;
  const filmsToShow = currentFilms.slice(0, safeCount);

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

  if (feedback) {
    feedback.textContent = "Préparation du rendu...";
  }

  try {
    cartItem.posterImage = await window.MppPosterJpeg?.createPosterJpeg(cartItem, {
      width: 1500,
      quality: 0.88,
    });
  } catch (error) {
    console.warn("Impossible de générer le JPEG du poster.", error);
  }

  try {
    const existingCart = JSON.parse(localStorage.getItem("mppCart") || "[]");
    existingCart.push(cartItem);
    localStorage.setItem("mppCart", JSON.stringify(existingCart));
    window.updateMppCartIndicator?.();
  } catch (error) {
    console.warn("Impossible d'enregistrer le panier local avec le JPEG.", error);
    delete cartItem.posterImage;
    try {
      const existingCart = JSON.parse(localStorage.getItem("mppCart") || "[]");
      existingCart.push(cartItem);
      localStorage.setItem("mppCart", JSON.stringify(existingCart));
      window.updateMppCartIndicator?.();
    } catch (fallbackError) {
      console.warn("Impossible d'enregistrer le panier local.", fallbackError);
    }
  }

  if (feedback) {
    feedback.textContent = "Poster ajouté au panier.";
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
      backgroundImage: "assets/img/backgrounds/bg.png",
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
      scheduleMagnifierCloneRefresh();
    },
  });

  posterTextCustomizer.bind();
  posterTextCustomizer.writeControls();

  posterCountSelect.addEventListener("change", () => {
    if (posterWorkspace.style.display !== "none" && currentFilms.length > 0) {
      generatePoster(currentFilms);
    }
  });
  document.getElementById("posterAddToCart")?.addEventListener("click", addPosterToCart);

  syncPosterFormatToolbar();
  syncPosterFontSizeLabels();
}

bindPosterEditor();
setupPosterPreviewLayoutSync();
setupPosterMagnifier();
setupPosterZoomToggle();
