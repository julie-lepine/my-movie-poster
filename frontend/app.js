// =====================
// STATE
// =====================
let reponses = {};
let currentFilms = [];
let currentQuestionIndex = 0;

const DEFAULT_TITLE = "Ton univers cinéma";
const DEFAULT_SUBTITLE = "Création personnalisée";

// =====================
// DOM
// =====================
const progress = document.querySelector(".progress");
const quiz = document.getElementById("quiz");
const questionStep = document.getElementById("questionStep");
const questionTitle = document.getElementById("questionTitle");
const answersGrid = document.getElementById("answersGrid");
const prevQuestionBtn = document.getElementById("prevQuestionBtn");
const restartQuizBtn = document.getElementById("restartQuizBtn");

const results = document.getElementById("resultats");
const poster = document.getElementById("posterContainer");
const posterWorkspace = document.getElementById("posterWorkspace");
const downloadBtn = document.getElementById("downloadPoster");
const shareBtn = document.getElementById("sharePoster");
const loading = document.getElementById("loadingScreen");
const titleEditorInput = document.getElementById("titleEditorInput");
const subtitleEditorInput = document.getElementById("subtitleEditorInput");
const resetPosterTextBtn = document.getElementById("resetPosterText");
const posterCountSelect = document.getElementById("posterCountSelect");
const posterPreviewViewport = document.getElementById("posterPreviewViewport");
const posterPreviewScaleSlot = document.getElementById("posterPreviewScaleSlot");
const posterMagnifier = document.getElementById("posterMagnifier");

// =====================
// MAPPING
// =====================
const mapping = {
  palette: {
    cyberpunk: ["psychologique", "sombre", "dynamique"],
    vintage: ["amour", "soleil", "emotion"],
    dark: ["sombre", "drame", "introspection"],
    dreamy: ["imaginaire", "melancolie", "emotion"],
    energetic: ["dynamique", "aventure", "soleil"],
  },
  ambiance: {
    nostalgic: ["melancolie", "emotion", "introspection"],
    rebellious: ["dynamique", "sombre", "psychologique"],
    dreamy: ["imaginaire", "amour", "emotion"],
    mysterious: ["psychologique", "introspection", "sombre"],
    energetic: ["dynamique", "aventure", "soleil"],
  },
  persona: {
    dreamy: ["imaginaire", "emotion", "melancolie"],
    epic: ["dynamique", "aventure", "drame"],
    dark: ["sombre", "psychologique", "introspection"],
    rebellious: ["dynamique", "sombre", "drame"],
    surreal: ["imaginaire", "psychologique", "nature"],
    peaceful: ["nature", "introspection", "emotion"],
    energetic: ["dynamique", "soleil", "aventure"],
  },
  soundtrack: {
    cyberpunk: ["psychologique", "dynamique", "sombre"],
    vintage: ["emotion", "amour", "soleil"],
    dreamy: ["melancolie", "imaginaire", "introspection"],
    rebellious: ["dynamique", "sombre", "drame"],
    epic: ["drame", "aventure", "dynamique"],
    dark: ["introspection", "sombre", "psychologique"],
  },
  emotion: {
    epic: ["dynamique", "aventure", "drame"],
    nostalgic: ["melancolie", "emotion", "amour"],
    mysterious: ["psychologique", "sombre", "introspection"],
    peaceful: ["nature", "introspection", "emotion"],
    energetic: ["dynamique", "soleil", "aventure"],
    dark: ["sombre", "drame", "introspection"],
  },
  world: {
    minimalist: ["introspection", "nature", "emotion"],
    surreal: ["imaginaire", "psychologique", "melancolie"],
    detailed: ["drame", "emotion", "psychologique"],
    urban: ["drame", "psychologique", "dynamique"],
    vintage: ["amour", "emotion", "soleil"],
    futuristic: ["imaginaire", "dynamique", "aventure"],
  },
};

function runMappingSanityCheck() {
  const issues = [];

  quizData.forEach((question) => {
    const mappedQuestion = mapping[question.id];
    if (!mappedQuestion) {
      issues.push(`Question sans mapping: "${question.id}"`);
      return;
    }

    question.options.forEach((option) => {
      const tags = mappedQuestion[option.value];
      if (!Array.isArray(tags) || tags.length === 0) {
        issues.push(
          `Option non mappée: "${question.id}.${option.value}" (label: "${option.label}")`
        );
      }
    });

    Object.keys(mappedQuestion).forEach((mappedValue) => {
      const existsInQuiz = question.options.some((opt) => opt.value === mappedValue);
      if (!existsInQuiz) {
        issues.push(`Clé mapping orpheline: "${question.id}.${mappedValue}"`);
      }
    });
  });

  if (issues.length > 0) {
    console.warn("[Mapping sanity check] Problèmes détectés:");
    issues.forEach((issue) => console.warn(`- ${issue}`));
  } else {
    console.info("[Mapping sanity check] OK");
  }
}

// =====================
// INIT UI STATE
// =====================
function initUI() {
  runMappingSanityCheck();
  posterWorkspace.style.display = "none";
  downloadBtn.style.display = "none";
  shareBtn.style.display = "none";
  results.style.display = "none";
  renderCurrentQuestion(false);
  updateProgress();
}

initUI();

// =====================
// QUIZ FLOW
// =====================
function renderCurrentQuestion(withFade = true) {
  const quizCard = document.getElementById("quizCard");
  const render = () => {
    const current = quizData[currentQuestionIndex];
    const selected = reponses[current.id];

    questionStep.textContent = `Étape ${currentQuestionIndex + 1} / ${quizData.length}`;
    questionTitle.textContent = current.question;
    answersGrid.innerHTML = "";

    current.options.forEach((option) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "answer-card";
      const optionImage = getOptionImage(current.id, option.value);

      const media = document.createElement("div");
      media.className = "answer-media";

      if (optionImage) {
        const img = document.createElement("img");
        img.src = optionImage;
        img.alt = option.label;
        img.loading = "lazy";
        media.appendChild(img);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "answer-media-placeholder";
        placeholder.textContent = "Image";
        media.appendChild(placeholder);
      }

      const label = document.createElement("span");
      label.className = "answer-label";
      label.textContent = option.label;

      btn.appendChild(media);
      btn.appendChild(label);

      if (selected === option.value) {
        btn.classList.add("selected");
      }
      btn.addEventListener("click", () => handleAnswerSelect(option.value));
      answersGrid.appendChild(btn);
    });

    prevQuestionBtn.disabled = currentQuestionIndex === 0;
  };

  if (!withFade) {
    render();
    return;
  }

  quizCard.classList.add("is-fading");
  setTimeout(() => {
    render();
    quizCard.classList.remove("is-fading");
  }, 140);
}

function getOptionImage(questionId, optionValue) {
  return optionImages[questionId]?.[optionValue] || "";
}

function handleAnswerSelect(value) {
  const current = quizData[currentQuestionIndex];
  reponses[current.id] = value;

  for (let i = currentQuestionIndex + 1; i < quizData.length; i++) {
    delete reponses[quizData[i].id];
  }

  const tags = buildTagsFromAnswers();
  recommend(tags);
  updateProgress();

  if (Object.keys(reponses).length === quizData.length) {
    runFinal();
    return;
  }

  currentQuestionIndex++;
  renderCurrentQuestion(true);
}

function updateProgress() {
  progress.style.width = `${(Object.keys(reponses).length / quizData.length) * 100}%`;
}

prevQuestionBtn.addEventListener("click", () => {
  if (currentQuestionIndex === 0) return;
  currentQuestionIndex--;
  renderCurrentQuestion(true);
});

restartQuizBtn.addEventListener("click", () => {
  reponses = {};
  currentFilms = [];
  currentQuestionIndex = 0;
  updateProgress();
  renderCurrentQuestion(true);
});

// =====================
// RECO ENGINE
// =====================
function recommend(tags) {
  const scored = filmsDB.map((f) => {
    let score = 0;

    f.tags.forEach((t) => {
      if (tags.includes(t)) score++;
    });

    return { ...f, score };
  });

  const targetCount = Math.min(100, filmsDB.length);
  const correlatedPool = scored.filter((film) => film.score > 0);
  const selected = pickWeightedUnique(correlatedPool, targetCount);

  // Fallback: complète avec des films aléatoires si le pool corrélé est insuffisant
  if (selected.length < targetCount) {
    const remaining = scored.filter(
      (film) => !selected.some((chosen) => chosen.image === film.image)
    );
    shuffleInPlace(remaining);
    selected.push(...remaining.slice(0, targetCount - selected.length));
  }

  currentFilms = selected.slice(0, targetCount);
}

function pickWeightedUnique(pool, maxCount) {
  const available = [...pool];
  const picked = [];

  while (available.length > 0 && picked.length < maxCount) {
    const totalWeight = available.reduce(
      (sum, film) => sum + Math.max(1, film.score),
      0
    );
    let roll = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let i = 0; i < available.length; i++) {
      roll -= Math.max(1, available[i].score);
      if (roll <= 0) {
        selectedIndex = i;
        break;
      }
    }

    picked.push(available[selectedIndex]);
    available.splice(selectedIndex, 1);
  }

  return picked;
}

function shuffleInPlace(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}

function buildTagsFromAnswers() {
  let tags = [];
  Object.entries(reponses).forEach(([questionId, value]) => {
    tags = tags.concat(mapping[questionId]?.[value] || []);
  });
  return [...new Set(tags)];
}

// =====================
// LIVE PREVIEW
// =====================
function renderResults(films) {
  results.innerHTML = "";

  films.forEach((f) => {
    const div = document.createElement("div");
    div.className = "film-card";

    div.innerHTML = `
      <img src="${f.image}">
      <div class="film-title-preview">${f.titre}</div>
    `;

    results.appendChild(div);
  });
}

// =====================
// FINAL FLOW
// =====================
function runFinal() {
  showLoading();

  setTimeout(() => {
    hideLoading();

    // hide quiz + results
    quiz.style.display = "none";
    results.style.display = "none";

    // show poster container + editor panel
    posterWorkspace.style.display = "flex";
    poster.style.display = "grid";
    downloadBtn.style.display = "inline-block";
    shareBtn.style.display = "inline-block";

    generatePoster(currentFilms);

    // REVEAL ANIMATION
    revealPoster();

    setTimeout(scheduleMagnifierCloneRefresh, 950);
  }, 1200);
}

// =====================
// POSTER GENERATION
// =====================

function generatePoster(films) {

  const poster = document.getElementById("posterContainer");
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
    /* 6 × 8 : vignettes plus larges, lignes étirées sur la hauteur A2 */
    48: { cols: 6, gap: 12 },
    /* 8 col × 13 lignes (12×8 + 4) ; queue flex pour la dernière ligne */
    100: { cols: 8, gap: 10 },
  };
  const currentLayout = layoutByCount[safeCount] || layoutByCount[100];
  const cols = currentLayout.cols;
  const rows = Math.ceil(safeCount / cols);

  poster.classList.toggle("poster-sheet--fill-movie-grid", safeCount === 48);

  // reset grid
  grid.innerHTML = "";
  grid.dataset.layout = String(safeCount);
  grid.style.setProperty("--poster-cols", String(cols));
  grid.style.setProperty("--poster-rows", String(rows));
  grid.style.setProperty("--poster-gap", `${currentLayout.gap}px`);

  // reset header si besoin (évite doublons)
  const oldHeader = poster.querySelector(".poster-header");
  if (oldHeader) oldHeader.remove();

  // HEADER
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

  const filmsToShow = films.slice(0, safeCount);
  const remainder = safeCount % cols;
  const mainCount = remainder === 0 ? safeCount : safeCount - remainder;

  function appendFilmCard(f, i, parent = grid) {
    const card = document.createElement("div");
    card.className = "poster-film";

    card.style.opacity = "0";
    card.style.transform = "scale(0.95)";
    card.style.transition = "0.5s ease";

    card.innerHTML = `
      <img src="${f.image}">
      <div class="film-info">
      <div class="film-title">${f.titre}</div>
      ${f.year ? `<div class="film-year">${f.year}</div>` : ""}
      <img class="film-circle" src="./assets/site/circle.png" alt="">
      </div>
    `;

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
  grid.querySelectorAll(".poster-film > img").forEach((img) => {
    if (img.complete) return;
    img.addEventListener(
      "load",
      () => requestAnimationFrame(syncPosterLayoutMetrics),
      { passive: true }
    );
  });

  const footerLogo = poster.querySelector(".poster-footer-logo");
  if (footerLogo && !footerLogo.complete) {
    footerLogo.addEventListener(
      "load",
      () => requestAnimationFrame(syncPosterLayoutMetrics),
      { passive: true }
    );
  }
}

function collectPosterFilmCards(grid) {
  return [
    ...grid.querySelectorAll(":scope > .poster-film"),
    ...grid.querySelectorAll(":scope > .poster-grid-tail .poster-film"),
  ];
}

/** Header + footer = hauteur de la plus grande carte (25 / 48 / 100), avec convergence si la grille 1fr réagit. */
function syncPosterHeaderFooterBandHeight() {
  const posterEl = document.getElementById("posterContainer");
  const grid = document.getElementById("posterGrid");
  if (!posterEl || !grid || posterWorkspace.style.display === "none") return;

  const cards = collectPosterFilmCards(grid);
  if (!cards.length) {
    posterEl.style.removeProperty("--poster-band-height");
    posterEl.removeAttribute("data-band-synced");
    return;
  }

  let prevApplied = -2;
  for (let step = 0; step < 12; step++) {
    let maxH = 0;
    for (const el of collectPosterFilmCards(grid)) {
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
  syncPosterPreviewSlotSize();
}

// =====================
// APERÇU : taille du slot = boîte affichée du stage (getBoundingClientRect, post-transform)
// =====================
function syncPosterPreviewSlotSize() {
  const stage = document.querySelector(".poster-preview-stage");
  const slot = posterPreviewScaleSlot;
  if (!stage || !slot || posterWorkspace.style.display === "none") return;

  /* Taille *affichée* après transform (évite la hauteur « layout » trop grande et la zone grise) */
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

// =====================
// POSTER LOUPE (clone + zoom local)
// =====================
let magnifierCloneTimer = 0;

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

function setupPosterMagnifier() {
  if (!posterPreviewViewport || !posterMagnifier) return;

  posterPreviewViewport.addEventListener("mousemove", (e) => {
    if (posterWorkspace.style.display === "none") return;
    if (posterPreviewViewport.dataset.posterLayout !== "100") {
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

// =====================
// REVEAL POSTER (NETFLIX STYLE)
// =====================
function revealPoster() {
  poster.style.opacity = "0";
  poster.style.transform = "translateY(30px) scale(0.98)";

  setTimeout(() => {
    poster.style.transition = "0.8s ease";
    poster.style.opacity = "1";
    poster.style.transform = "translateY(0) scale(1)";
  }, 100);
}

// =====================
// LOADING
// =====================
function showLoading() {
  loading.classList.remove("hidden");
}

function hideLoading() {
  loading.classList.add("hidden");
}

// =====================
// DOWNLOAD (SAFE)
// =====================
function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Conversion canvas -> blob impossible"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

downloadBtn.addEventListener("click", async () => {
  if (typeof html2canvas !== "function") {
    console.error("html2canvas indisponible : vérifie le chargement du script CDN.");
    return;
  }

  try {
    const canvas = await html2canvas(poster, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#f2f2f2",
      logging: false,
      imageTimeout: 15000,
    });
    const blob = await canvasToBlob(canvas);
    downloadBlob(blob, "cinema-wrapped.png");
  } catch (primaryError) {
    console.warn("Capture standard échouée, tentative fallback...", primaryError);

    try {
      const fallbackCanvas = await html2canvas(poster, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#f2f2f2",
        logging: false,
        imageTimeout: 20000,
      });
      const fallbackBlob = await canvasToBlob(fallbackCanvas);
      downloadBlob(fallbackBlob, "cinema-wrapped.png");
    } catch (fallbackError) {
      console.error("Téléchargement impossible:", fallbackError);
      alert("Impossible de télécharger le poster. Vérifie que les images sont bien accessibles, puis réessaie.");
    }
  }
});

// =====================
// SHARE (SAFE FALLBACK)
// =====================
shareBtn.addEventListener("click", async () => {
  const canvas = await html2canvas(poster, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#f2f2f2",
  });

  const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));

  const file = new File([blob], "poster.png", { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: "Mon cinéma",
        files: [file],
      });
      return;
    } catch (e) { }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cinema-wrapped.png";
  a.click();
});

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
  };

  const updateTitle = () => {
    renderCurrentEditorValues();
    scheduleMagnifierCloneRefresh();
  };

  const updateSubtitle = () => {
    renderCurrentEditorValues();
    scheduleMagnifierCloneRefresh();
  };

  titleEditorInput.addEventListener("input", updateTitle);
  subtitleEditorInput.addEventListener("input", updateSubtitle);

  resetPosterTextBtn.addEventListener("click", () => {
    titleEditorInput.value = DEFAULT_TITLE;
    subtitleEditorInput.value = DEFAULT_SUBTITLE;
    renderCurrentEditorValues();
    scheduleMagnifierCloneRefresh();
  });

  posterCountSelect.addEventListener("change", () => {
    if (posterWorkspace.style.display !== "none" && currentFilms.length > 0) {
      generatePoster(currentFilms);
    }
  });
}

bindPosterEditor();
setupPosterPreviewLayoutSync();
setupPosterMagnifier();

