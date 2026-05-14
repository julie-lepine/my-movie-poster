const galleryState = {
  films: [],
  filteredFilms: [],
  visibleCount: 20,
  selectedColor: "",
  filtersOpen: true,
};

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
}

function createGalleryCard(film) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "gallery-card";
  card.addEventListener("click", () => openGalleryLightbox(film));

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
  card.appendChild(img);
  card.appendChild(content);

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
  renderGalleryGrid();

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

  document.getElementById("galleryLoadMore")?.addEventListener("click", () => {
    galleryState.visibleCount += 10;
    renderGalleryGrid();
  });

  document.getElementById("galleryLightboxClose")?.addEventListener("click", closeGalleryLightbox);
  document.getElementById("galleryLightbox")?.addEventListener("click", (event) => {
    if (event.target.id === "galleryLightbox") closeGalleryLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeGalleryLightbox();
  });
}

setupGalleryPage();
