const galleryState = {
  films: [],
  filteredFilms: [],
  selectedFilms: [],
  customization: null,
  visibleCount: 20,
  selectedColor: "",
  filtersOpen: true,
};

var galleryTextCustomizer = null;

function normalizeGalleryText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function toGalleryArray(value) {
  return Array.isArray(value) ? value : [value].filter(Boolean);
}

function getGalleryFilmId(film) {
  return `${film.titre || ""}::${film.year || ""}::${film.image || ""}`;
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
    getUniqueGalleryValues((film) => [film.realisateur]).filter(
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
    colorRoot.appendChild(button);
  });
}

function syncGalleryColorButtons() {
  document.querySelectorAll(".gallery-color-swatch").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.color === galleryState.selectedColor);
  });
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
  if (filters.director && film.realisateur !== filters.director) return false;
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

function toggleGalleryFilmSelection(film) {
  const filmId = getGalleryFilmId(film);
  const existingIndex = galleryState.selectedFilms.findIndex(
    (selectedFilm) => getGalleryFilmId(selectedFilm) === filmId
  );

  if (existingIndex >= 0) {
    galleryState.selectedFilms.splice(existingIndex, 1);
  } else {
    galleryState.selectedFilms.push(film);
  }

  renderGalleryGrid();
  renderGallerySelection();
}

function selectFilteredGalleryFilms() {
  galleryState.filteredFilms.forEach((film) => {
    if (!isGalleryFilmSelected(film)) {
      galleryState.selectedFilms.push(film);
    }
  });

  renderGalleryGrid();
  renderGallerySelection();
}

function syncGallerySelectFilteredButton() {
  const button = document.getElementById("gallerySelectFiltered");
  if (button) button.disabled = galleryState.filteredFilms.length === 0;
}

function syncGallerySelectionActionButtons() {
  const hasSelection = galleryState.selectedFilms.length > 0;
  const clearSelection = document.getElementById("galleryClearSelection");
  if (clearSelection) clearSelection.disabled = !hasSelection;
}

function clearGallerySelection() {
  galleryState.selectedFilms = [];
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
  selectButton.setAttribute(
    "aria-label",
    selected ? `Retirer ${film.titre} de la sélection` : `Ajouter ${film.titre} à la sélection`
  );
  selectButton.addEventListener("click", () => toggleGalleryFilmSelection(film));

  const selectIcon = document.createElement("img");
  selectIcon.src = "./assets/site/circle.png";
  selectIcon.alt = "";
  selectButton.appendChild(selectIcon);

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
    visibleFilms.forEach((film) => grid.appendChild(createGalleryCard(film)));
  }

  if (loadMore) {
    loadMore.hidden = galleryState.visibleCount >= galleryState.filteredFilms.length;
  }
}

function createGallerySelectionItem(film) {
  const item = document.createElement("div");
  item.className = "gallery-selection-film";

  const img = document.createElement("img");
  img.src = film.image;
  img.alt = "";
  img.loading = "lazy";

  const info = document.createElement("div");
  info.className = "gallery-selection-film-info";

  const circle = document.createElement("img");
  circle.className = "gallery-selection-film-circle";
  circle.src = "./assets/site/circle.png";
  circle.alt = "";

  const title = document.createElement("span");
  title.className = "gallery-selection-film-title";
  title.textContent = film.titre;

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

function getGallerySelectionColumnCount(count) {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  if (count <= 16) return 4;
  if (count <= 25) return 5;
  return 6;
}

function renderGallerySelection() {
  const grid = document.getElementById("gallerySelectionGrid");
  const count = document.getElementById("gallerySelectionCount");
  const addToCart = document.getElementById("galleryAddToCart");
  if (!grid) return;

  const selectedCount = galleryState.selectedFilms.length;
  if (count) {
    count.textContent = `${selectedCount} film${selectedCount > 1 ? "s" : ""} sélectionné${
      selectedCount > 1 ? "s" : ""
    }`;
  }
  if (addToCart) {
    addToCart.disabled = selectedCount === 0;
  }
  syncGallerySelectionActionButtons();

  grid.innerHTML = "";
  grid.style.setProperty(
    "--gallery-selection-cols",
    String(getGallerySelectionColumnCount(selectedCount))
  );

  if (!selectedCount) {
    const empty = document.createElement("p");
    empty.className = "gallery-selection-empty";
    empty.textContent = "Coche des films pour composer ton poster.";
    grid.appendChild(empty);
    return;
  }

  galleryState.selectedFilms.forEach((film) => {
    grid.appendChild(createGallerySelectionItem(film));
  });
}

function openGalleryCustomizer() {
  const modal = document.getElementById("galleryCustomizeModal");
  if (!modal) return;
  galleryTextCustomizer?.writeControls();
  modal.hidden = false;
  document.getElementById("galleryTitleInput")?.focus();
}

function closeGalleryCustomizer() {
  const modal = document.getElementById("galleryCustomizeModal");
  if (modal) modal.hidden = true;
}

function addGallerySelectionToCart() {
  const feedback = document.getElementById("galleryCartFeedback");
  if (!galleryState.selectedFilms.length) return;

  const cartItem = {
    type: "selection-poster",
    addedAt: new Date().toISOString(),
    customization: galleryTextCustomizer?.getState() || galleryState.customization,
    films: galleryState.selectedFilms.map((film) => ({
      titre: film.titre,
      year: film.year,
      image: film.image,
    })),
  };

  try {
    const existingCart = JSON.parse(localStorage.getItem("mppCart") || "[]");
    existingCart.push(cartItem);
    localStorage.setItem("mppCart", JSON.stringify(existingCart));
  } catch (error) {
    console.warn("Impossible d'enregistrer le panier local.", error);
  }

  if (feedback) {
    const count = galleryState.selectedFilms.length;
    feedback.textContent = `${count} film${count > 1 ? "s" : ""} ajouté${
      count > 1 ? "s" : ""
    } au panier.`;
  }
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
      titleSize: 24,
      subtitleSize: 11,
      titleColor: "#25272d",
      subtitleColor: "#5c606b",
      backgroundImage: "assets/img/backgrounds/bg.png",
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
      mode: "inline",
      background: ".gallery-selection-poster",
      title: "gallerySelectionTitle",
      subtitle: "gallerySelectionSubtitle",
      titleNormalWeight: "800",
      titleBoldWeight: "900",
      subtitleNormalWeight: "700",
      subtitleBoldWeight: "800",
    },
    onChange: (customizer) => {
      galleryState.customization = customizer.getState();
    },
  });

  galleryTextCustomizer.bind();
  galleryTextCustomizer.writeControls();
  galleryTextCustomizer.apply();
  galleryState.customization = galleryTextCustomizer.getState();

  document.getElementById("galleryCustomizeOpen")?.addEventListener("click", openGalleryCustomizer);
  document.getElementById("galleryCustomizeClose")?.addEventListener("click", closeGalleryCustomizer);
  document.getElementById("galleryClearSelection")?.addEventListener("click", clearGallerySelection);
  document.getElementById("galleryAddToCart")?.addEventListener("click", addGallerySelectionToCart);

  document.getElementById("galleryCustomizeModal")?.addEventListener("click", (event) => {
    if (event.target.id === "galleryCustomizeModal") closeGalleryCustomizer();
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
  setupGalleryFilterOptions();
  setupGalleryCustomizer();
  renderGalleryGrid();
  renderGallerySelection();
  syncGallerySelectFilteredButton();

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
    ?.addEventListener("input", applyGalleryFilters);
  document
    .getElementById("gallerySelectFiltered")
    ?.addEventListener("click", selectFilteredGalleryFilms);

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
    }
  });
}

setupGalleryPage();
