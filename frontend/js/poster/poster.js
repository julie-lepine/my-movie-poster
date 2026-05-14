// =====================
// POSTER : génération, métriques, loupe, éditeur
// (références DOM et constantes : globals mpp-dom / mpp-defaults)
// =====================

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

  function appendFilmCard(f, i, parent = grid) {
    const card = document.createElement("div");
    card.className = "poster-film";

    card.style.opacity = "0";
    card.style.transform = "scale(0.95)";
    card.style.transition = "0.5s ease";

    const img = document.createElement("img");
    img.src = f.image;
    img.alt = "";

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

    info.appendChild(circle);
    card.appendChild(img);
    card.appendChild(info);

    parent.appendChild(card);

    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "scale(1)";
    }, i * 28);
    return card;
  }

  for (let i = 0; i < mainCount; i++) {
    appendFilmCard(filmsToShow[i], i, grid);
  }

  if (remainder > 0) {
    const tail = document.createElement("div");
    tail.className = "poster-grid-tail";
    tail.style.setProperty("--poster-tail-count", String(remainder));
    for (let j = 0; j < remainder; j++) {
      const i = mainCount + j;
      appendFilmCard(filmsToShow[i], i, tail);
    }
    grid.appendChild(tail);
  }

  scheduleMagnifierCloneRefresh();
  requestAnimationFrame(() => {
    requestAnimationFrame(syncPosterLayoutMetrics);
  });
  grid.querySelectorAll(".poster-film > img").forEach((imgEl) => {
    const bump = () => requestAnimationFrame(syncPosterLayoutMetrics);
    if (imgEl.complete) bump();
    else imgEl.addEventListener("load", bump, { passive: true });
  });

  const footerLogo = poster.querySelector(".poster-footer-logo");
  if (footerLogo && !footerLogo.complete) {
    footerLogo.addEventListener(
      "load",
      () => requestAnimationFrame(syncPosterLayoutMetrics),
      { passive: true }
    );
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

function syncPosterHeaderFooterBandHeight() {
  const posterEl = document.getElementById("posterContainer");
  const grid = document.getElementById("posterGrid");
  if (!posterEl || !grid || posterWorkspace.style.display === "none") return;

  const cards = collectPosterFilmCardsForBandHeight(grid);
  if (!cards.length) {
    posterEl.style.removeProperty("--poster-band-height");
    posterEl.removeAttribute("data-band-synced");
    return;
  }

  let prevApplied = -2;
  for (let step = 0; step < 12; step++) {
    let maxH = 0;
    for (const el of collectPosterFilmCardsForBandHeight(grid)) {
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
  syncPosterHeaderFooterBandHeight();
  fitPosterFilmTitles();
  syncPosterHeaderFooterBandHeight();
  syncPosterPreviewSlotSize();
}

function readCssNumber(el, propertyName, fallback) {
  const raw = getComputedStyle(el).getPropertyValue(propertyName);
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function fitPosterFilmTitle(titleEl) {
  if (!titleEl || titleEl.clientWidth < 1 || titleEl.clientHeight < 1) return;

  const computed = getComputedStyle(titleEl);
  const currentFontSize = parseFloat(computed.fontSize) || 10;
  const maxSize = readCssNumber(titleEl, "--film-title-max-size", currentFontSize);
  const minSize = readCssNumber(titleEl, "--film-title-min-size", Math.max(5, maxSize * 0.45));

  const fits = () =>
    titleEl.scrollWidth <= titleEl.clientWidth + 1 &&
    titleEl.scrollHeight <= titleEl.clientHeight + 1;

  titleEl.style.setProperty("--film-title-fit-size", `${maxSize}px`);
  if (fits()) return;

  let low = minSize;
  let high = maxSize;
  for (let i = 0; i < 12; i++) {
    const mid = (low + high) / 2;
    titleEl.style.setProperty("--film-title-fit-size", `${mid}px`);
    if (fits()) low = mid;
    else high = mid;
  }

  titleEl.style.setProperty("--film-title-fit-size", `${low.toFixed(2)}px`);
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
    requestAnimationFrame(syncPosterLayoutMetrics);
  });
  ro.observe(posterEl);

  window.addEventListener("resize", () => {
    requestAnimationFrame(syncPosterLayoutMetrics);
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
    requestAnimationFrame(syncPosterLayoutMetrics);
    return;
  }
  if (!posterMagnifierEnabled) {
    const innerOff = posterMagnifier?.querySelector(".poster-magnifier-inner");
    if (innerOff) innerOff.innerHTML = "";
    if (posterMagnifier) {
      posterMagnifier.hidden = true;
      posterMagnifier.setAttribute("aria-hidden", "true");
    }
    requestAnimationFrame(syncPosterLayoutMetrics);
    return;
  }
  magnifierCloneTimer = setTimeout(() => {
    refreshPosterMagnifierClone();
    requestAnimationFrame(syncPosterLayoutMetrics);
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
      requestAnimationFrame(syncPosterLayoutMetrics);
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

function syncPosterFormatToolbar() {
  for (const key of ["bold", "italic", "underline", "strike"]) {
    const tBtn = document.getElementById(TITLE_FMT_BTN[key]);
    if (tBtn) {
      const on = titleTextFormat[key];
      tBtn.setAttribute("aria-pressed", String(on));
      tBtn.classList.toggle("is-active", on);
    }
    const sBtn = document.getElementById(SUBTITLE_FMT_BTN[key]);
    if (sBtn) {
      const on = subtitleTextFormat[key];
      sBtn.setAttribute("aria-pressed", String(on));
      sBtn.classList.toggle("is-active", on);
    }
  }
}

function applyTitleSubtitleFormatClasses() {
  const titleEl = document.getElementById("posterTitle");
  const subEl = document.getElementById("posterSubtitle");
  if (titleEl) {
    titleEl.classList.toggle("is-editor-bold", titleTextFormat.bold);
    titleEl.classList.toggle("is-editor-italic", titleTextFormat.italic);
    titleEl.classList.toggle("is-editor-underline", titleTextFormat.underline);
    titleEl.classList.toggle("is-editor-strike", titleTextFormat.strike);
  }
  if (subEl) {
    subEl.classList.toggle("is-editor-bold", subtitleTextFormat.bold);
    subEl.classList.toggle("is-editor-italic", subtitleTextFormat.italic);
    subEl.classList.toggle("is-editor-underline", subtitleTextFormat.underline);
    subEl.classList.toggle("is-editor-strike", subtitleTextFormat.strike);
  }
}

function syncPosterFontSizeLabels() {
  if (titleFontSizeValue && titleFontSizeInput) {
    titleFontSizeValue.textContent = titleFontSizeInput.value;
  }
  if (subtitleFontSizeValue && subtitleFontSizeInput) {
    subtitleFontSizeValue.textContent = subtitleFontSizeInput.value;
  }
}

function applyPosterTypographyFromEditor() {
  const el = document.getElementById("posterContainer");
  if (!el) return;

  const tf = titleFontSelect?.value?.trim();
  const sf = subtitleFontSelect?.value?.trim();
  const tc = titleColorInput?.value?.trim();
  const sc = subtitleColorInput?.value?.trim();

  if (tf) el.style.setProperty("--poster-title-font", tf);
  if (sf) el.style.setProperty("--poster-subtitle-font", sf);
  if (tc) el.style.setProperty("--poster-title-color", tc);
  if (sc) el.style.setProperty("--poster-subtitle-color", sc);

  const titlePx = parseInt(titleFontSizeInput?.value, 10);
  const subPx = parseInt(subtitleFontSizeInput?.value, 10);
  if (Number.isFinite(titlePx) && titlePx > 0) {
    el.style.setProperty("--poster-title-font-size", `${titlePx}px`);
  } else {
    el.style.removeProperty("--poster-title-font-size");
  }
  if (Number.isFinite(subPx) && subPx > 0) {
    el.style.setProperty("--poster-subtitle-font-size", `${subPx}px`);
  } else {
    el.style.removeProperty("--poster-subtitle-font-size");
  }
}

function bindPosterEditor() {
  const renderCurrentEditorValues = () => {
    const titleNode = document.getElementById("posterTitle");
    if (titleNode) {
      titleNode.textContent = titleEditorInput.value.trim() || DEFAULT_TITLE;
    }

    const subtitleNode = document.getElementById("posterSubtitle");
    if (subtitleNode) {
      subtitleNode.textContent =
        subtitleEditorInput.value.trim() || DEFAULT_SUBTITLE;
    }
    applyPosterTypographyFromEditor();
    applyTitleSubtitleFormatClasses();
  };

  const bump = () => {
    renderCurrentEditorValues();
    syncPosterFormatToolbar();
    scheduleMagnifierCloneRefresh();
  };

  titleEditorInput.addEventListener("input", bump);
  subtitleEditorInput.addEventListener("input", bump);
  titleFontSelect?.addEventListener("change", bump);
  subtitleFontSelect?.addEventListener("change", bump);
  titleColorInput?.addEventListener("input", bump);
  subtitleColorInput?.addEventListener("input", bump);

  function onFontSizeInput() {
    syncPosterFontSizeLabels();
    applyPosterTypographyFromEditor();
    scheduleMagnifierCloneRefresh();
  }
  titleFontSizeInput?.addEventListener("input", onFontSizeInput);
  subtitleFontSizeInput?.addEventListener("input", onFontSizeInput);

  function wireFmtBtn(btnId, key, scope) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const fmt = scope === "title" ? titleTextFormat : subtitleTextFormat;
      fmt[key] = !fmt[key];
      syncPosterFormatToolbar();
      applyTitleSubtitleFormatClasses();
      scheduleMagnifierCloneRefresh();
    });
  }
  for (const key of ["bold", "italic", "underline", "strike"]) {
    wireFmtBtn(TITLE_FMT_BTN[key], key, "title");
    wireFmtBtn(SUBTITLE_FMT_BTN[key], key, "subtitle");
  }

  resetPosterTextBtn.addEventListener("click", () => {
    titleEditorInput.value = DEFAULT_TITLE;
    subtitleEditorInput.value = DEFAULT_SUBTITLE;
    if (titleFontSelect) titleFontSelect.selectedIndex = 0;
    if (subtitleFontSelect) subtitleFontSelect.selectedIndex = 0;
    if (titleColorInput) titleColorInput.value = DEFAULT_TITLE_COLOR;
    if (subtitleColorInput) subtitleColorInput.value = DEFAULT_SUBTITLE_COLOR;
    if (titleFontSizeInput) titleFontSizeInput.value = String(DEFAULT_TITLE_FONT_SIZE_PX);
    if (subtitleFontSizeInput) {
      subtitleFontSizeInput.value = String(DEFAULT_SUBTITLE_FONT_SIZE_PX);
    }
    syncPosterFontSizeLabels();
    for (const k of ["bold", "italic", "underline", "strike"]) {
      titleTextFormat[k] = false;
      subtitleTextFormat[k] = false;
    }
    bump();
  });

  posterCountSelect.addEventListener("change", () => {
    if (posterWorkspace.style.display !== "none" && currentFilms.length > 0) {
      generatePoster(currentFilms);
    }
  });

  syncPosterFormatToolbar();
  syncPosterFontSizeLabels();
}

bindPosterEditor();
setupPosterPreviewLayoutSync();
setupPosterMagnifier();
setupPosterZoomToggle();
