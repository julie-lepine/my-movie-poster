/**
 * Aperçu poster dans un conteneur hôte (modal Mon Poster, panier, etc.).
 * Même logique que sizePosterLargePreviewClone dans poster.js.
 */
(function () {
  /** ~420mm × 594mm en px (aligné sur #posterContainer hors viewport). */
  const POSTER_A2_FALLBACK_W = 1587;
  const POSTER_A2_FALLBACK_H = 2245;
  const POSTER_MIN_BASE_W = 400;

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

  function clearPosterMeasureInlineStyles(poster) {
    if (!poster) return;
    poster.style.removeProperty("width");
    poster.style.removeProperty("max-width");
    poster.style.removeProperty("min-width");
    poster.style.removeProperty("height");
    poster.style.removeProperty("min-height");
    poster.style.removeProperty("max-height");
    poster.style.removeProperty("transform");
    poster.style.removeProperty("transform-origin");
  }

  /** Largeur/hauteur A2 avant mesure (évite la lamelle width:auto dans un hôte vide). */
  function preparePosterSheetForA2Measure(poster) {
    if (!poster) return;
    poster.style.removeProperty("transform");
    poster.style.removeProperty("transform-origin");
    poster.style.width = "var(--poster-a2-width)";
    poster.style.minWidth = "var(--poster-a2-width)";
    poster.style.maxWidth = "var(--poster-a2-width)";
    poster.style.height = "var(--poster-a2-height)";
    poster.style.minHeight = "var(--poster-a2-height)";
    poster.style.maxHeight = "var(--poster-a2-height)";
  }

  function readPosterSheetBaseSize(poster, options) {
    let baseWidth = poster.offsetWidth || options.fallbackWidth || POSTER_A2_FALLBACK_W;
    let baseHeight = poster.offsetHeight || options.fallbackHeight || POSTER_A2_FALLBACK_H;
    if (baseWidth < POSTER_MIN_BASE_W || baseHeight < POSTER_MIN_BASE_W) {
      baseWidth = options.fallbackWidth || POSTER_A2_FALLBACK_W;
      baseHeight = options.fallbackHeight || POSTER_A2_FALLBACK_H;
    } else if (baseWidth > 24 && (!baseHeight || baseHeight < 24)) {
      baseHeight = Math.round((baseWidth * 594) / 420);
    } else if (baseHeight > 24 && (!baseWidth || baseWidth < 24)) {
      baseWidth = Math.round((baseHeight * 420) / 594);
    }
    return { baseWidth, baseHeight };
  }

  function syncPosterSheetLayoutMetrics(poster) {
    if (!poster) return;
    poster.querySelectorAll(".film-title").forEach((titleEl) => {
      delete titleEl.dataset.fitKey;
      fitPosterFilmTitle(titleEl);
    });
  }

  /**
   * @param {HTMLElement} poster — .poster-sheet (dimensions A2 naturelles)
   * @param {HTMLElement} host — conteneur qui reçoit width/height scalés
   * @param {object} [options]
   */
  function sizePosterSheetInHost(poster, host, options) {
    if (!poster || !host) return;

    const sizingEl = options.sizingEl || host.closest(".cart-preview-content") || host.parentElement;
    const { baseWidth, baseHeight } = readPosterSheetBaseSize(poster, options);
    if (baseWidth < 1 || baseHeight < 1) return;

    const padX = options.horizontalPad ?? 56;
    const padY = options.verticalPad ?? 70;
    const minW = options.minWidth ?? 280;
    const minH = options.minHeight ?? 360;
    const maxFitScale = options.maxFitScale ?? 0.72;

    const availW = Math.max(minW, (sizingEl?.clientWidth || host.clientWidth || minW) - padX);
    const availH = Math.max(minH, (sizingEl?.clientHeight || host.clientHeight || minH) - padY);
    const scale = Math.min(availW / baseWidth, availH / baseHeight, maxFitScale);
    if (!Number.isFinite(scale) || scale <= 0) return;

    host.style.width = `${Math.ceil(baseWidth * scale)}px`;
    host.style.height = `${Math.ceil(baseHeight * scale)}px`;
    host.style.maxWidth = options.hostMaxWidth ?? "100%";
    host.style.maxHeight = options.hostMaxHeight ?? "100%";
    host.style.overflow = "hidden";
    host.style.position = host.style.position || "relative";
    poster.style.transformOrigin = options.transformOrigin ?? "top left";
    poster.style.transform = `scale(${scale})`;
  }

  window.MppPosterPreviewHost = {
    readCssNumber,
    fitPosterFilmTitle,
    clearPosterMeasureInlineStyles,
    preparePosterSheetForA2Measure,
    readPosterSheetBaseSize,
    syncPosterSheetLayoutMetrics,
    sizePosterSheetInHost,
    POSTER_A2_FALLBACK_W,
    POSTER_A2_FALLBACK_H,
  };
})();
