const galleryState = {
  films: [],
  filteredFilms: [],
  selectedFilms: [],
  customization: null,
  visibleCount: 20,
  selectedColor: "",
  filtersOpen: true,
  /** Poster carré (1 film) : couleur du cadre (fond autour de l’affiche). */
  squareFrameColor: "#ffffff",
};

const GALLERY_SELECTION_MAX_COUNT = 100;
const GALLERY_CIRCLE_SRC = "./assets/site/circle.png";
const GALLERY_PREVIEW_DESIGN_W = 340;
const GALLERY_PREVIEW_DESIGN_H = Math.round((GALLERY_PREVIEW_DESIGN_W * 594) / 420);
/** Cadre autour de l’image (ratio identique export JPEG). */
const GALLERY_SQUARE_FRAME_INSET_PCT = 8;

var galleryTextCustomizer = null;
var galleryCustomizePreviewFrame = 0;
var galleryCustomizePreviewNeedsRefresh = false;
var galleryCustomizePreviewNeedsResize = false;
var _galleryCustomizeResizeTimer = 0;
var gallerySelectionMetricsFrame = 0;

const GALLERY_POSTER_CSS_VARS = [
  "--poster-title-font",
  "--poster-subtitle-font",
  "--poster-title-color",
  "--poster-subtitle-color",
  "--poster-film-title-color",
  "--poster-film-year-color",
  "--poster-title-font-size",
  "--poster-subtitle-font-size",
  "--poster-cols",
  "--poster-rows",
  "--poster-gap",
];

const GALLERY_PREVIEW_RESIZE_KEYS = new Set([
  "title",
  "subtitle",
  "titleSize",
  "subtitleSize",
  "backgroundImage",
  "titleFormat",
  "subtitleFormat",
]);

function copyGalleryPosterCustomizationStyles(source, clone) {
  GALLERY_POSTER_CSS_VARS.forEach((prop) => {
    const value = source.style.getPropertyValue(prop);
    if (value) clone.style.setProperty(prop, value);
    else clone.style.removeProperty(prop);
  });

  const bgImage = source.style.backgroundImage;
  if (bgImage && bgImage !== "none") {
    clone.style.backgroundImage = bgImage;
    clone.style.backgroundRepeat = "no-repeat";
    clone.style.backgroundPosition = "center";
    clone.style.backgroundSize = "100% 100%";
  } else {
    clone.style.removeProperty("background-image");
    clone.style.removeProperty("background-repeat");
    clone.style.removeProperty("background-position");
    clone.style.removeProperty("background-size");
  }
}

function syncGallerySelectionGridMetrics() {
  const poster = document.querySelector(".gallery-selection-poster.poster-sheet");
  const grid = document.getElementById("gallerySelectionGrid");
  if (!poster || !grid || typeof syncGallerySelectionTitleMetrics !== "function") return;

  syncGallerySelectionTitleMetrics(grid);
}

function scheduleGallerySelectionGridMetrics() {
  if (gallerySelectionMetricsFrame) return;
  gallerySelectionMetricsFrame = requestAnimationFrame(() => {
    gallerySelectionMetricsFrame = requestAnimationFrame(() => {
      gallerySelectionMetricsFrame = 0;
      syncGallerySelectionGridMetrics();
    });
  });
}

function prepareGalleryCustomizeCloneLayout(clone) {
  clone.style.width = `${GALLERY_PREVIEW_DESIGN_W}px`;
  clone.style.maxWidth = `${GALLERY_PREVIEW_DESIGN_W}px`;
  clone.style.minWidth = "0";
  clone.style.height = "auto";
  clone.style.minHeight = "0";
  clone.style.maxHeight = "none";
}

function sizeGalleryCustomizePreviewClone(clone) {
  const preview = document.getElementById("galleryCustomizePreview");
  if (!preview || !clone) return;

  const frame = preview.closest(".customize-live-preview");
  clone.style.removeProperty("transform");
  prepareGalleryCustomizeCloneLayout(clone);
  preview.style.width = `${GALLERY_PREVIEW_DESIGN_W}px`;
  preview.style.height = "auto";
  preview.style.maxWidth = "100%";
  void clone.offsetWidth;

  const baseWidth = clone.offsetWidth || GALLERY_PREVIEW_DESIGN_W;
  const baseHeight = clone.offsetHeight || GALLERY_PREVIEW_DESIGN_H;

  const rect = frame?.getBoundingClientRect();
  const frameW = rect && rect.width > 8 ? rect.width : frame?.clientWidth || 400;
  const frameH = rect && rect.height > 8 ? rect.height : frame?.clientHeight || 520;
  const pad = 36;
  const availableWidth = Math.max(200, frameW - pad);
  const availableHeight = Math.max(220, frameH - pad);
  const scale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight);
  if (!Number.isFinite(scale) || scale <= 0) return;

  preview.style.width = `${Math.ceil(baseWidth * scale)}px`;
  preview.style.height = `${Math.ceil(baseHeight * scale)}px`;
  preview.style.overflow = "hidden";
  clone.style.transformOrigin = "top left";
  clone.style.transform = `scale(${scale})`;
}

function onGalleryCustomizeWindowResize() {
  clearTimeout(_galleryCustomizeResizeTimer);
  _galleryCustomizeResizeTimer = window.setTimeout(() => {
    const modal = document.getElementById("galleryCustomizeModal");
    const preview = document.getElementById("galleryCustomizePreview");
    const clone = preview?.querySelector(".gallery-customize-poster-clone");
    if (!modal || modal.hidden || !clone) return;
    sizeGalleryCustomizePreviewClone(clone);
  }, 150);
}

function syncGalleryCustomizePreview(options = {}) {
  const modal = document.getElementById("galleryCustomizeModal");
  const preview = document.getElementById("galleryCustomizePreview");
  const source = document.querySelector(".gallery-selection-poster.poster-sheet");
  const clone = preview?.querySelector(".gallery-customize-poster-clone");
  if (!modal || modal.hidden || !preview || !source) return;
  if (!clone) {
    refreshGalleryCustomizePreview();
    return;
  }

  const classTokens = source.className.split(/\s+/).filter(Boolean);
  clone.className = classTokens.filter((token) => token !== "poster-preview-watermark").join(" ");
  clone.classList.add("gallery-customize-poster-clone");
  copyGalleryPosterCustomizationStyles(source, clone);

  ["data-poster-layout", "data-gallery-selection"].forEach((name) => {
    if (source.hasAttribute(name)) clone.setAttribute(name, source.getAttribute(name));
    else clone.removeAttribute(name);
  });

  const sourceGrid = source.querySelector(".poster-grid");
  const targetGrid = clone.querySelector(".poster-grid");
  if (sourceGrid && targetGrid) {
    if (sourceGrid.dataset.gallerySelection === "true") {
      targetGrid.dataset.gallerySelection = "true";
    } else {
      delete targetGrid.dataset.gallerySelection;
    }
    delete targetGrid.dataset.layout;
    if (sourceGrid.dataset.cols) targetGrid.dataset.cols = sourceGrid.dataset.cols;
    else delete targetGrid.dataset.cols;
    if (sourceGrid.dataset.rows) targetGrid.dataset.rows = sourceGrid.dataset.rows;
    else delete targetGrid.dataset.rows;
    [
      "--poster-cols",
      "--poster-rows",
      "--poster-gap",
      "--poster-row-gap",
      "--gallery-title-block-height",
      "--gallery-unified-title-size",
    ].forEach(
      (prop) => {
        const value = sourceGrid.style.getPropertyValue(prop);
        if (value) targetGrid.style.setProperty(prop, value);
        else targetGrid.style.removeProperty(prop);
      }
    );
  }

  [".poster-title", ".poster-subtitle"].forEach((selector) => {
    const sourceEl = source.querySelector(selector);
    const targetEl = clone.querySelector(selector);
    if (!sourceEl || !targetEl) return;
    targetEl.textContent = sourceEl.textContent;
    targetEl.className = sourceEl.className;
  });

  const sourceCircles = source.querySelectorAll(".film-circle");
  const targetCircles = clone.querySelectorAll(".film-circle");
  sourceCircles.forEach((sourceCircle, index) => {
    const targetCircle = targetCircles[index];
    if (targetCircle && targetCircle.src !== sourceCircle.src) targetCircle.src = sourceCircle.src;
  });

  if (options.resize) sizeGalleryCustomizePreviewClone(clone);
}

function refreshGalleryCustomizePreview() {
  const modal = document.getElementById("galleryCustomizeModal");
  const preview = document.getElementById("galleryCustomizePreview");
  const source = document.querySelector(".gallery-selection-poster.poster-sheet");
  if (!modal || modal.hidden || !preview || !source) return;

  const clone = source.cloneNode(true);
  clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  clone.classList.remove("poster-preview-watermark");
  clone.classList.add("gallery-customize-poster-clone");
  preview.innerHTML = "";
  preview.appendChild(clone);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => sizeGalleryCustomizePreviewClone(clone));
  });
}

function scheduleGalleryCustomizePreview(options = {}) {
  if (options.refresh) galleryCustomizePreviewNeedsRefresh = true;
  if (options.resize) galleryCustomizePreviewNeedsResize = true;
  if (galleryCustomizePreviewFrame) return;
  galleryCustomizePreviewFrame = requestAnimationFrame(() => {
    galleryCustomizePreviewFrame = 0;
    const shouldRefresh = galleryCustomizePreviewNeedsRefresh;
    const shouldResize = galleryCustomizePreviewNeedsResize;
    galleryCustomizePreviewNeedsRefresh = false;
    galleryCustomizePreviewNeedsResize = false;
    if (shouldRefresh) refreshGalleryCustomizePreview();
    else syncGalleryCustomizePreview({ resize: shouldResize });
    scheduleGallerySelectionGridMetrics();
  });
}

function normalizeGalleryHexColor(hex) {
  const s = String(hex || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  return "#ffffff";
}

function applyGallerySquareFrameColor(color) {
  const hex = normalizeGalleryHexColor(color);
  galleryState.squareFrameColor = hex;
  document.querySelectorAll(".gallery-square-poster").forEach((el) => {
    el.style.backgroundColor = hex;
  });
  const input = document.getElementById("gallerySquareFrameColorInput");
  if (input) input.value = hex;
}

function syncGallerySquarePosterFilm(film) {
  const img = document.getElementById("gallerySquarePosterImg");
  const modalImg = document.getElementById("gallerySquareFrameModalPreviewImg");
  const src = film?.image || "";
  const alt = film?.titre ? `Affiche ${film.titre}` : "";
  if (img) {
    img.src = src;
    img.alt = alt;
    protectImageElement(img);
  }
  if (modalImg) {
    modalImg.src = src;
    modalImg.alt = alt;
    protectImageElement(modalImg);
  }
}

function syncGallerySelectionPosterMode(selectedCount) {
  const multiWrap = document.getElementById("galleryMultiPosterWrap");
  const squareWrap = document.getElementById("gallerySquareWatermarkWrap");
  const squareBtn = document.getElementById("gallerySquareFrameOpen");
  const multiCustomize = document.getElementById("galleryCustomizeOpen");
  const isSquare = selectedCount === 1;

  if (multiWrap) multiWrap.hidden = isSquare;
  if (squareWrap) squareWrap.hidden = !isSquare;
  if (squareBtn) squareBtn.hidden = !isSquare;
  if (multiCustomize) multiCustomize.hidden = selectedCount < 2;

  if (isSquare && galleryState.selectedFilms[0]) {
    syncGallerySquarePosterFilm(galleryState.selectedFilms[0]);
    applyGallerySquareFrameColor(galleryState.squareFrameColor);
  }
}

function openGallerySquareFrameModal() {
  const modal = document.getElementById("gallerySquareFrameModal");
  if (!modal || galleryState.selectedFilms.length !== 1) return;
  syncGallerySquarePosterFilm(galleryState.selectedFilms[0]);
  applyGallerySquareFrameColor(galleryState.squareFrameColor);
  modal.hidden = false;
  document.getElementById("gallerySquareFrameColorInput")?.focus();
}

function closeGallerySquareFrameModal() {
  const modal = document.getElementById("gallerySquareFrameModal");
  if (modal) modal.hidden = true;
}

function isGallerySquareFrameModalEventInsideCard(event, card) {
  if (!card) return false;
  if (typeof event.composedPath === "function") {
    return event.composedPath().includes(card);
  }
  return event.target instanceof Node && card.contains(event.target);
}

function normalizeGalleryText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function debounceGalleryAction(callback, delay = 120) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

function shuffleGalleryFilms(films) {
  const copy = [...films];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getUniqueGalleryValues(getValues) {
  return [
    ...new Set(
      filmsDB
        .flatMap((film) => getValues(film))
        .filter(Boolean)
        .map((value) => String(value))
    ),
  ].sort((a, b) => a.localeCompare(b, "fr"));
}

function fillGallerySelect(selectId, values, placeholder) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  const fragment = document.createDocumentFragment();
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    fragment.appendChild(option);
  });
  select.appendChild(fragment);
}

function toGalleryArray(value) {
  return Array.isArray(value) ? value : [value].filter(Boolean);
}

function getGalleryFilmId(film) {
  return `${film.titre || ""}::${film.year || ""}::${film.image || ""}`;
}

function getGalleryThumbnailSrc(src) {
  if (!src || src.includes("/thumbs/")) return src || "";
  return src.replace(/(^|\/)assets\/img\//, "$1assets/img/thumbs/");
}

function isGalleryFilmSelected(film) {
  const filmId = getGalleryFilmId(film);
  return galleryState.selectedFilms.some(
    (selectedFilm) => getGalleryFilmId(selectedFilm) === filmId
  );
}

function setupGalleryFilterOptions() {
  fillGallerySelect(
    "galleryDirectorFilter",
    getUniqueGalleryValues((film) => toGalleryArray(film.realisateur)).filter(
      (value) => value !== "À compléter"
    ),
    "Réalisateur"
  );
  fillGallerySelect(
    "galleryGenreFilter",
    getUniqueGalleryValues((film) => film.genre || []),
    "Genre du film"
  );
  fillGallerySelect(
    "galleryYearFilter",
    getUniqueGalleryValues((film) => [film.year]).sort((a, b) => Number(b) - Number(a)),
    "Année"
  );

  const colorRoot = document.getElementById("galleryColorFilters");
  if (!colorRoot) return;

  const colorMap = {
    beige: "#d8c3a5",
    black: "#111111",
    blue: "#1ca8e3",
    brown: "#7a4a2a",
    green: "#25b95a",
    grey: "#818181",
    orange: "#f28c28",
    pink: "#ff5ca8",
    purple: "#7c4dff",
    red: "#e73535",
    white: "#ffffff",
    yellow: "#f5cf3f",
  };

  colorRoot.innerHTML = "";
  const fragment = document.createDocumentFragment();
  getUniqueGalleryValues((film) => toGalleryArray(film.couleurs)).forEach((colorName) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gallery-color-swatch";
    button.style.setProperty("--swatch-color", colorMap[colorName] || "#d8e2e6");
    button.dataset.color = colorName;
    button.setAttribute("aria-label", `Filtrer par couleur ${colorName}`);
    button.addEventListener("click", () => {
      galleryState.selectedColor =
        galleryState.selectedColor === colorName ? "" : colorName;
      syncGalleryColorButtons();
      applyGalleryFilters();
    });
    fragment.appendChild(button);
  });
  colorRoot.appendChild(fragment);
  syncGalleryColorButtons();
}

function syncGalleryColorButtons() {
  document.querySelectorAll(".gallery-color-swatch").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.color === galleryState.selectedColor);
  });
  const clearColorBtn = document.getElementById("galleryClearColorFilter");
  if (clearColorBtn) clearColorBtn.disabled = !galleryState.selectedColor;
}

function clearGalleryColorFilter() {
  if (!galleryState.selectedColor) return;
  galleryState.selectedColor = "";
  syncGalleryColorButtons();
  applyGalleryFilters();
}

function readGalleryFilters() {
  return {
    color: galleryState.selectedColor,
    director: document.getElementById("galleryDirectorFilter")?.value || "",
    genre: document.getElementById("galleryGenreFilter")?.value || "",
    year: document.getElementById("galleryYearFilter")?.value || "",
    search: normalizeGalleryText(document.getElementById("gallerySearchInput")?.value || ""),
  };
}

function filmMatchesGalleryFilters(film, filters) {
  if (filters.color && !toGalleryArray(film.couleurs).includes(filters.color)) return false;
  if (filters.director && !toGalleryArray(film.realisateur).includes(filters.director)) return false;
  if (filters.genre && !(film.genre || []).includes(filters.genre)) return false;
  if (filters.year && String(film.year) !== filters.year) return false;
  if (filters.search && !normalizeGalleryText(film.titre).includes(filters.search)) {
    return false;
  }
  return true;
}

function applyGalleryFilters() {
  const filters = readGalleryFilters();
  galleryState.visibleCount = 20;
  galleryState.filteredFilms = galleryState.films.filter((film) =>
    filmMatchesGalleryFilters(film, filters)
  );
  renderGalleryGrid();
  syncGallerySelectFilteredButton();
}

function findGallerySelectedFilmIndex(film) {
  const byReference = galleryState.selectedFilms.indexOf(film);
  if (byReference >= 0) return byReference;

  const filmId = getGalleryFilmId(film);
  return galleryState.selectedFilms.findIndex(
    (selectedFilm) => getGalleryFilmId(selectedFilm) === filmId
  );
}

function removeGalleryFilmFromSelection(film) {
  const existingIndex = findGallerySelectedFilmIndex(film);
  removeGalleryFilmFromSelectionAtIndex(existingIndex);
}

function removeGalleryFilmFromSelectionAtIndex(index) {
  if (index < 0 || index >= galleryState.selectedFilms.length) return;

  galleryState.selectedFilms.splice(index, 1);
  setGalleryCartFeedback("");
  renderGalleryGrid();
  renderGallerySelection();
}

function toggleGalleryFilmSelection(film) {
  const existingIndex = findGallerySelectedFilmIndex(film);

  if (existingIndex >= 0) {
    galleryState.selectedFilms.splice(existingIndex, 1);
    setGalleryCartFeedback("");
  } else {
    if (galleryState.selectedFilms.length >= GALLERY_SELECTION_MAX_COUNT) {
      setGalleryCartFeedback(`La sélection est limitée à ${GALLERY_SELECTION_MAX_COUNT} films.`);
      return;
    }
    galleryState.selectedFilms.push(film);
    setGalleryCartFeedback("");
  }

  renderGalleryGrid();
  renderGallerySelection();
}

function selectFilteredGalleryFilms() {
  let addedCount = 0;
  galleryState.filteredFilms.forEach((film) => {
    if (galleryState.selectedFilms.length >= GALLERY_SELECTION_MAX_COUNT) return;
    if (!isGalleryFilmSelected(film)) {
      galleryState.selectedFilms.push(film);
      addedCount++;
    }
  });

  if (galleryState.selectedFilms.length >= GALLERY_SELECTION_MAX_COUNT) {
    setGalleryCartFeedback(`Sélection limitée à ${GALLERY_SELECTION_MAX_COUNT} films maximum.`);
  } else if (addedCount > 0) {
    setGalleryCartFeedback("");
  }

  renderGalleryGrid();
  renderGallerySelection();
}

function syncGallerySelectFilteredButton() {
  const button = document.getElementById("gallerySelectFiltered");
  if (!button) return;
  const hasSelectableFilm = galleryState.filteredFilms.some((film) => !isGalleryFilmSelected(film));
  button.disabled =
    galleryState.filteredFilms.length === 0 ||
    !hasSelectableFilm ||
    galleryState.selectedFilms.length >= GALLERY_SELECTION_MAX_COUNT;
}

function syncGallerySelectionActionButtons() {
  const hasSelection = galleryState.selectedFilms.length > 0;
  const clearSelection = document.getElementById("galleryClearSelection");
  if (clearSelection) clearSelection.disabled = !hasSelection;
}

function clearGallerySelection() {
  galleryState.selectedFilms = [];
  setGalleryCartFeedback("");
  renderGalleryGrid();
  renderGallerySelection();
}

function createGalleryCard(film) {
  const selected = isGalleryFilmSelected(film);
  const card = document.createElement("article");
  card.className = "gallery-card";
  card.classList.toggle("is-selected", selected);

  const preview = document.createElement("button");
  preview.type = "button";
  preview.className = "gallery-card-preview";
  preview.addEventListener("click", () => openGalleryLightbox(film));

  const img = document.createElement("img");
  img.src = film.image;
  img.alt = film.titre;
  img.loading = "lazy";
  img.decoding = "async";
  protectImageElement(img);

  const content = document.createElement("span");
  content.className = "gallery-card-content";

  const title = document.createElement("span");
  title.className = "gallery-card-title";
  title.textContent = film.titre;

  const year = document.createElement("span");
  year.className = "gallery-card-year";
  year.textContent = film.year || "";

  content.appendChild(title);
  content.appendChild(year);
  preview.appendChild(img);
  preview.appendChild(content);

  const selectButton = document.createElement("button");
  selectButton.type = "button";
  selectButton.className = "gallery-select-toggle";
  selectButton.setAttribute("aria-pressed", String(selected));
  selectButton.disabled = !selected && galleryState.selectedFilms.length >= GALLERY_SELECTION_MAX_COUNT;
  selectButton.setAttribute(
    "aria-label",
    selected
      ? `Retirer ${film.titre} de la sélection`
      : `Ajouter ${film.titre} à la sélection`
  );
  selectButton.addEventListener("click", () => toggleGalleryFilmSelection(film));

  card.appendChild(preview);
  card.appendChild(selectButton);

  return card;
}

function renderGalleryGrid() {
  const grid = document.getElementById("galleryGrid");
  const loadMore = document.getElementById("galleryLoadMore");
  if (!grid) return;

  const visibleFilms = galleryState.filteredFilms.slice(0, galleryState.visibleCount);
  grid.innerHTML = "";

  if (!visibleFilms.length) {
    const empty = document.createElement("div");
    empty.className = "gallery-empty";
    empty.textContent = "Aucun film ne correspond aux filtres.";
    grid.appendChild(empty);
  } else {
    const fragment = document.createDocumentFragment();
    visibleFilms.forEach((film) => fragment.appendChild(createGalleryCard(film)));
    grid.appendChild(fragment);
  }

  if (loadMore) {
    loadMore.hidden = galleryState.visibleCount >= galleryState.filteredFilms.length;
  }
}

function createGallerySelectionItem(film, useThumbnails) {
  const item = document.createElement("div");
  item.className = "poster-film";

  const thumb = document.createElement("div");
  thumb.className = "poster-film__thumb";

  const img = document.createElement("img");
  img.src = useThumbnails ? getGalleryThumbnailSrc(film.image) : film.image;
  if (useThumbnails) img.dataset.fallbackSrc = film.image;
  img.alt = "";
  img.loading = "eager";
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
  thumb.appendChild(img);

  const info = document.createElement("div");
  info.className = "film-info";

  const circle = document.createElement("img");
  circle.className = "film-circle";
  circle.src = galleryState.customization?.filmCircleSrc || GALLERY_CIRCLE_SRC;
  circle.alt = "";
  circle.decoding = "async";
  protectImageElement(circle);

  const title = document.createElement("div");
  title.className = "film-title";
  title.textContent = film.titre;
  title.title = film.titre;

  const year = document.createElement("div");
  year.className = "film-year";
  year.textContent = film.year || "";

  const meta = document.createElement("div");
  meta.className = "film-meta";
  meta.appendChild(year);
  meta.appendChild(circle);

  info.appendChild(title);
  info.appendChild(meta);
  item.appendChild(thumb);
  item.appendChild(info);

  return item;
}

function compareGalleryFilmsByTitle(a, b) {
  return String(a?.titre || "").localeCompare(String(b?.titre || ""), "fr", {
    sensitivity: "base",
  });
}

function createGallerySummarySelectToggle(film, selectionIndex) {
  const selectButton = document.createElement("button");
  selectButton.type = "button";
  selectButton.className = "gallery-select-toggle gallery-select-toggle--summary";
  selectButton.setAttribute("aria-pressed", "true");
  selectButton.dataset.galleryFilmId = getGalleryFilmId(film);
  selectButton.dataset.gallerySelectionIndex = String(selectionIndex);
  selectButton.setAttribute("aria-label", `Retirer ${film.titre} de la sélection`);
  return selectButton;
}

function onGallerySelectionSummaryListClick(event) {
  const button = event.target.closest(".gallery-select-toggle--summary");
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();

  const selectionIndex = Number(button.dataset.gallerySelectionIndex);
  const filmId = button.dataset.galleryFilmId || "";
  const filmAtIndex = galleryState.selectedFilms[selectionIndex];

  if (filmAtIndex && getGalleryFilmId(filmAtIndex) === filmId) {
    removeGalleryFilmFromSelectionAtIndex(selectionIndex);
    return;
  }

  const film = galleryState.selectedFilms.find(
    (selectedFilm) => getGalleryFilmId(selectedFilm) === filmId
  );
  if (film) removeGalleryFilmFromSelection(film);
}

function bindGallerySelectionSummaryList() {
  const summaryList = document.getElementById("gallerySelectionSummaryList");
  if (!summaryList || summaryList.dataset.bound === "true") return;
  summaryList.dataset.bound = "true";
  summaryList.addEventListener("click", onGallerySelectionSummaryListClick);
}

function renderGallerySelectionSummary() {
  const summary = document.getElementById("gallerySelectionSummary");
  const summaryCount = document.getElementById("gallerySelectionSummaryCount");
  const summaryList = document.getElementById("gallerySelectionSummaryList");
  if (!summary || !summaryList) return;

  const selectedCount = galleryState.selectedFilms.length;
  const showSummary = selectedCount >= 2;
  summary.hidden = !showSummary;

  if (!showSummary) {
    summaryList.innerHTML = "";
    return;
  }

  if (summaryCount) {
    summaryCount.textContent = `${selectedCount} film${
      selectedCount > 1 ? "s" : ""
    } sélectionné${selectedCount > 1 ? "s" : ""}`;
  }

  summaryList.innerHTML = "";
  const sortedFilms = [...galleryState.selectedFilms].sort(compareGalleryFilmsByTitle);
  const fragment = document.createDocumentFragment();

  sortedFilms.forEach((film) => {
    const item = document.createElement("li");
    item.className = "gallery-selection-summary__item";
    const selectionIndex = galleryState.selectedFilms.indexOf(film);

    const title = document.createElement("span");
    title.className = "gallery-selection-summary__title";
    title.textContent = film.titre || "";

    item.appendChild(createGallerySummarySelectToggle(film, selectionIndex));
    item.appendChild(title);
    fragment.appendChild(item);
  });

  summaryList.appendChild(fragment);
}

function renderGallerySelection() {
  const grid = document.getElementById("gallerySelectionGrid");
  const count = document.getElementById("gallerySelectionCount");
  const poster = grid?.closest(".gallery-selection-poster");
  if (!grid) return;

  const selectedCount = galleryState.selectedFilms.length;
  if (count) {
    count.textContent = `${selectedCount} film${
      selectedCount > 1 ? "s" : ""
    } sélectionné${selectedCount > 1 ? "s" : ""}`;
  }
  document.querySelectorAll("#gallerySideAddToCart, #gallerySideSaveCreation").forEach((button) => {
    button.disabled = selectedCount === 0;
  });
  syncGallerySelectionActionButtons();
  syncGallerySelectFilteredButton();
  syncGallerySelectionPosterMode(selectedCount);
  renderGallerySelectionSummary();

  if (selectedCount === 1) {
    grid.innerHTML = "";
    return;
  }

  grid.innerHTML = "";
  const layout = window.getGallerySelectionLayout(selectedCount);
  const styleTarget = poster || grid;
  if (poster) {
    poster.dataset.gallerySelection = "true";
    poster.dataset.posterLayout = `${layout.cols}x${layout.rows}`;
  }
  grid.dataset.gallerySelection = "true";
  grid.removeAttribute("data-layout");
  grid.dataset.cols = String(layout.cols);
  grid.dataset.rows = String(layout.rows);
  grid.style.setProperty("--poster-cols", String(layout.cols));
  grid.style.setProperty("--poster-rows", String(layout.rows));
  grid.style.setProperty("--poster-gap", `${layout.gap}px`);
  grid.style.setProperty("--poster-row-gap", `${layout.rowGap}px`);
  styleTarget.style.setProperty("--poster-cols", String(layout.cols));
  styleTarget.style.setProperty("--poster-rows", String(layout.rows));
  styleTarget.style.setProperty("--poster-gap", `${layout.gap}px`);
  styleTarget.style.setProperty("--poster-row-gap", `${layout.rowGap}px`);

  if (!selectedCount) {
    const empty = document.createElement("p");
    empty.className = "gallery-selection-empty";
    empty.textContent = "Coche des films pour composer ton poster.";
    grid.appendChild(empty);
    scheduleGalleryCustomizePreview({ refresh: true });
    return;
  }

  const fragment = document.createDocumentFragment();
  galleryState.selectedFilms.forEach((film) => {
    fragment.appendChild(createGallerySelectionItem(film, layout.useThumbnails));
  });
  grid.appendChild(fragment);
  grid.querySelectorAll(".poster-film__thumb > img, .poster-film > img").forEach((imgEl) => {
    if (!imgEl.complete) {
      imgEl.addEventListener("load", scheduleGallerySelectionGridMetrics, { passive: true, once: true });
    }
  });
  scheduleGallerySelectionGridMetrics();
  scheduleGalleryCustomizePreview({ refresh: true });
}

function openGalleryCustomizer() {
  const modal = document.getElementById("galleryCustomizeModal");
  if (!modal) return;
  galleryTextCustomizer?.writeControls();
  modal.hidden = false;
  scheduleGalleryCustomizePreview({ refresh: true });
  window.removeEventListener("resize", onGalleryCustomizeWindowResize);
  window.addEventListener("resize", onGalleryCustomizeWindowResize);
  document.getElementById("galleryTitleInput")?.focus();
}

function closeGalleryCustomizer() {
  window.removeEventListener("resize", onGalleryCustomizeWindowResize);
  clearTimeout(_galleryCustomizeResizeTimer);
  _galleryCustomizeResizeTimer = 0;
  const modal = document.getElementById("galleryCustomizeModal");
  if (modal) modal.hidden = true;
  const preview = document.getElementById("galleryCustomizePreview");
  if (preview) {
    preview.innerHTML = "";
    preview.style.removeProperty("width");
    preview.style.removeProperty("height");
    preview.style.removeProperty("max-width");
    preview.style.removeProperty("max-height");
  }
}

function isGalleryCustomizerEventInsideCard(event, card) {
  if (!card) return false;
  if (typeof event.composedPath === "function") {
    return event.composedPath().includes(card);
  }
  return event.target instanceof Node && card.contains(event.target);
}

function buildGalleryCartItem() {
  if (!galleryState.selectedFilms.length) return null;
  const filmsToShow = galleryState.selectedFilms.slice(0, GALLERY_SELECTION_MAX_COUNT);
  const selectionLayout = window.getGallerySelectionLayout(filmsToShow.length);

  const filmsPayload = filmsToShow.map((film) => ({
    titre: film.titre,
    year: film.year,
    image: film.image,
  }));

  if (filmsToShow.length === 1) {
    return {
      type: "square-frame-poster",
      addedAt: new Date().toISOString(),
      frameInsetPct: GALLERY_SQUARE_FRAME_INSET_PCT,
      frameColor: normalizeGalleryHexColor(galleryState.squareFrameColor),
      films: filmsPayload,
    };
  }

  return {
    type: "selection-poster",
    addedAt: new Date().toISOString(),
    customization: galleryTextCustomizer?.getState() || galleryState.customization,
    layoutCount: selectionLayout.layoutCount,
    posterCols: selectionLayout.cols,
    posterRows: selectionLayout.rows,
    films: filmsPayload,
  };
}

async function addGallerySelectionToCart() {
  const cartItem = buildGalleryCartItem();
  if (!cartItem) return;

  setGalleryCartFeedback("Ajout au panier...");

  try {
    const existingCart = JSON.parse(localStorage.getItem("mppCart") || "[]");
    existingCart.push(cartItem);
    localStorage.setItem("mppCart", JSON.stringify(existingCart));
    window.updateMppCartIndicator?.();
  } catch (error) {
    console.warn("Impossible d'enregistrer le panier local.", error);
  }

  setGalleryCartFeedback("Poster ajouté au panier.");
}

async function saveGalleryToAccount() {
  if (!window.MppSaveCreation?.runSave) return;
  await window.MppSaveCreation.runSave(
    buildGalleryCartItem,
    ".gallery-cart-feedback, .gallery-side-cart-feedback"
  );
}

function setGalleryCartFeedback(message) {
  document.querySelectorAll(".gallery-cart-feedback").forEach((feedback) => {
    feedback.textContent = message;
  });
}

function setupGalleryCustomizer() {
  galleryTextCustomizer = MppTextCustomizer.create({
    defaults: {
      title: "Ma sélection",
      subtitle: "Création personnalisée",
      titleFont:
        document.getElementById("galleryTitleFontSelect")?.value ||
        "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      subtitleFont:
        document.getElementById("gallerySubtitleFontSelect")?.value ||
        "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      titleSize: 22,
      subtitleSize: 11,
      titleColor: "#25272d",
      subtitleColor: "#5c606b",
      filmTitleColor: "#31343c",
      filmYearColor: "#5c606b",
      filmCircleSrc: GALLERY_CIRCLE_SRC,
      backgroundImage: "",
    },
    controls: {
      titleInput: "galleryTitleInput",
      subtitleInput: "gallerySubtitleInput",
      titleFontSelect: "galleryTitleFontSelect",
      subtitleFontSelect: "gallerySubtitleFontSelect",
      titleSizeInput: "galleryTitleSizeInput",
      subtitleSizeInput: "gallerySubtitleSizeInput",
      titleSizeLabel: "galleryTitleSizeValue",
      subtitleSizeLabel: "gallerySubtitleSizeValue",
      titleColorInput: "galleryTitleColorInput",
      subtitleColorInput: "gallerySubtitleColorInput",
      filmTitleColorInput: "galleryFilmTitleColorInput",
      filmYearColorInput: "galleryFilmYearColorInput",
      filmCircleSelect: "galleryFilmCircleSelect",
      backgroundSelect: "galleryBackgroundSelect",
      backgroundUpload: "galleryBackgroundUpload",
      resetButton: "galleryResetCustomization",
      formatButtons: {
        title: {
          bold: "[data-gallery-format-scope='title'][data-gallery-format='bold']",
          italic: "[data-gallery-format-scope='title'][data-gallery-format='italic']",
          strike: "[data-gallery-format-scope='title'][data-gallery-format='strike']",
        },
        subtitle: {
          bold: "[data-gallery-format-scope='subtitle'][data-gallery-format='bold']",
          italic: "[data-gallery-format-scope='subtitle'][data-gallery-format='italic']",
          strike: "[data-gallery-format-scope='subtitle'][data-gallery-format='strike']",
        },
      },
    },
    targets: {
      mode: "cssVars",
      root: ".gallery-selection-poster",
      background: ".gallery-selection-poster",
      title: "gallerySelectionTitle",
      subtitle: "gallerySelectionSubtitle",
      titleNormalWeight: "800",
      titleBoldWeight: "900",
      subtitleNormalWeight: "700",
      subtitleBoldWeight: "800",
    },
    onChange: (customizer, meta) => {
      galleryState.customization = customizer.getState();
      const changedKeys = meta?.changedKeys || [];
      const needsResize = changedKeys.some((key) => GALLERY_PREVIEW_RESIZE_KEYS.has(key));
      scheduleGalleryCustomizePreview({ resize: needsResize });
    },
  });

  galleryTextCustomizer.bind();
  galleryTextCustomizer.writeControls();
  galleryTextCustomizer.apply();
  galleryState.customization = galleryTextCustomizer.getState();

  document.getElementById("galleryCustomizeOpen")?.addEventListener("click", openGalleryCustomizer);
  document.getElementById("galleryCustomizeClose")?.addEventListener("click", closeGalleryCustomizer);
  document.getElementById("galleryClearSelection")?.addEventListener("click", clearGallerySelection);
  document.getElementById("gallerySideAddToCart")?.addEventListener("click", addGallerySelectionToCart);
  document.getElementById("gallerySideSaveCreation")?.addEventListener("click", saveGalleryToAccount);
  document.getElementById("galleryCustomizeValidate")?.addEventListener("click", closeGalleryCustomizer);

  const galleryCustomizeModal = document.getElementById("galleryCustomizeModal");
  const galleryCustomizeCard = document.getElementById("galleryCustomizeCard");
  galleryCustomizeModal?.addEventListener("pointerdown", (event) => {
    if (isGalleryCustomizerEventInsideCard(event, galleryCustomizeCard)) return;
    closeGalleryCustomizer();
  });

  document.getElementById("gallerySquareFrameOpen")?.addEventListener("click", openGallerySquareFrameModal);
  document.getElementById("gallerySquareFrameClose")?.addEventListener("click", closeGallerySquareFrameModal);
  document.getElementById("gallerySquareFrameValidate")?.addEventListener("click", closeGallerySquareFrameModal);
  document.getElementById("gallerySquareFrameColorInput")?.addEventListener("input", (event) => {
    applyGallerySquareFrameColor(event.target?.value);
  });

  const gallerySquareFrameModal = document.getElementById("gallerySquareFrameModal");
  const gallerySquareFrameCard = document.getElementById("gallerySquareFrameCard");
  gallerySquareFrameModal?.addEventListener("pointerdown", (event) => {
    if (isGallerySquareFrameModalEventInsideCard(event, gallerySquareFrameCard)) return;
    closeGallerySquareFrameModal();
  });
}

function openGalleryLightbox(film) {
  const lightbox = document.getElementById("galleryLightbox");
  const card = document.getElementById("galleryLightboxCard");
  if (!lightbox || !card) return;

  card.innerHTML = "";
  const img = document.createElement("img");
  img.src = film.image;
  img.alt = film.titre;
  img.decoding = "async";
  protectImageElement(img);

  const content = document.createElement("span");
  content.className = "gallery-card-content";

  const title = document.createElement("span");
  title.className = "gallery-card-title";
  title.textContent = film.titre;

  const year = document.createElement("span");
  year.className = "gallery-card-year";
  year.textContent = film.year || "";

  content.appendChild(title);
  content.appendChild(year);
  card.appendChild(img);
  card.appendChild(content);
  lightbox.hidden = false;
}

function closeGalleryLightbox() {
  const lightbox = document.getElementById("galleryLightbox");
  if (lightbox) lightbox.hidden = true;
}

function setupGalleryPage() {
  galleryState.films = shuffleGalleryFilms(filmsDB.filter((film) => film.image));
  galleryState.filteredFilms = [...galleryState.films];
  const applyGalleryFiltersDebounced = debounceGalleryAction(applyGalleryFilters);
  setupGalleryFilterOptions();
  bindGallerySelectionSummaryList();
  setupGalleryCustomizer();
  renderGalleryGrid();
  renderGallerySelection();
  syncGallerySelectFilteredButton();

  let gallerySelectionResizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(gallerySelectionResizeTimer);
    gallerySelectionResizeTimer = window.setTimeout(
      () => scheduleGallerySelectionGridMetrics(),
      120
    );
  });

  document
    .getElementById("galleryFilterToggle")
    ?.addEventListener("click", (event) => {
      galleryState.filtersOpen = !galleryState.filtersOpen;
      const filters = document.getElementById("galleryFilters");
      filters?.classList.toggle("is-collapsed", !galleryState.filtersOpen);
      event.currentTarget.setAttribute("aria-expanded", String(galleryState.filtersOpen));
    });

  ["galleryDirectorFilter", "galleryGenreFilter", "galleryYearFilter"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", applyGalleryFilters);
  });
  document.getElementById("galleryFilters")?.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  document
    .getElementById("gallerySearchInput")
    ?.addEventListener("input", applyGalleryFiltersDebounced);
  document
    .getElementById("gallerySelectFiltered")
    ?.addEventListener("click", selectFilteredGalleryFilms);
  document
    .getElementById("galleryClearColorFilter")
    ?.addEventListener("click", clearGalleryColorFilter);

  document.getElementById("galleryLoadMore")?.addEventListener("click", () => {
    galleryState.visibleCount += 10;
    renderGalleryGrid();
  });

  document.getElementById("galleryLightboxClose")?.addEventListener("click", closeGalleryLightbox);
  document.getElementById("galleryLightbox")?.addEventListener("click", (event) => {
    if (event.target.id === "galleryLightbox") closeGalleryLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeGalleryLightbox();
      closeGalleryCustomizer();
      closeGallerySquareFrameModal();
    }
  });
}

setupGalleryPage();
