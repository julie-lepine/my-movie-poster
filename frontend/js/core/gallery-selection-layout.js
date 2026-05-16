/**
 * Grille progressive vitrine / sélection panier :
 * 2 cols jusqu'à 6 films, puis ceil(sqrt(n)), max 10 colonnes.
 */
function getGallerySelectionGridCols(count) {
  if (count <= 0) return 1;
  if (count <= 1) return 1;
  if (count <= 6) return 2;
  return Math.min(10, Math.ceil(Math.sqrt(count)));
}

function getGallerySelectionGap(cols) {
  if (cols <= 2) return 12;
  if (cols <= 4) return 9;
  if (cols <= 6) return 7;
  if (cols <= 8) return 5;
  return 4;
}

/** Espacement vertical entre lignes de films (resserré pour agrandir les vignettes). */
function getGallerySelectionRowGap(cols, rows) {
  const colGap = getGallerySelectionGap(cols);
  const safeRows = Math.max(1, Number(rows) || 1);
  if (safeRows <= 2) return colGap;
  if (safeRows <= 4) return colGap + 1;
  if (safeRows <= 6) return colGap + 1;
  if (safeRows <= 8) return colGap + 2;
  return colGap + 2;
}

function withGallerySelectionGaps(layout) {
  return {
    ...layout,
    gap: layout.gap ?? getGallerySelectionGap(layout.cols),
    rowGap: getGallerySelectionRowGap(layout.cols, layout.rows),
  };
}

function getGallerySelectionLayoutKey(cols, rows) {
  return `sel-${cols}x${rows}`;
}

function getGallerySelectionLayout(count) {
  const safeCount = Math.max(0, Math.min(Number(count) || 0, 100));
  if (safeCount === 0) {
    return withGallerySelectionGaps({
      cols: 1,
      rows: 1,
      layoutCount: 0,
      layoutKey: "sel-0x0",
      gap: 18,
      useThumbnails: false,
    });
  }
  const cols = getGallerySelectionGridCols(safeCount);
  const rows = Math.ceil(safeCount / cols);
  const layoutCount = cols * rows;
  return withGallerySelectionGaps({
    cols,
    rows,
    layoutCount,
    layoutKey: getGallerySelectionLayoutKey(cols, rows),
    gap: getGallerySelectionGap(cols),
    useThumbnails: cols >= 8,
  });
}

/** Panier : nouveaux champs posterCols/Rows, ou layoutCount historique 25/48/100. */
function resolveGallerySelectionLayout(filmCount, item) {
  const count = Math.max(0, Math.min(Number(filmCount) || 0, 100));
  const storedCols = Number(item?.posterCols);
  if (Number.isFinite(storedCols) && storedCols >= 1) {
    const cols = Math.min(10, storedCols);
    const rows = Number(item?.posterRows) || Math.ceil(count / cols) || 1;
    return withGallerySelectionGaps({
      cols,
      rows,
      layoutCount: cols * rows,
      layoutKey: getGallerySelectionLayoutKey(cols, rows),
      gap: getGallerySelectionGap(cols),
      useThumbnails: cols >= 8,
    });
  }
  const legacy = Number(item?.layoutCount);
  if (legacy === 25 || legacy === 48 || legacy === 100) {
    if (legacy === 25) {
      const cols = Math.min(5, Math.max(1, count || 5));
      const rows = Math.ceil(Math.max(count, 1) / cols);
      return withGallerySelectionGaps({
        cols,
        rows,
        layoutCount: 25,
        layoutKey: getGallerySelectionLayoutKey(cols, rows),
        gap: getGallerySelectionGap(cols),
        useThumbnails: false,
      });
    }
    if (legacy === 48) {
      const cols = 6;
      const rows = Math.ceil(count / 6) || 8;
      return withGallerySelectionGaps({
        cols,
        rows,
        layoutCount: 48,
        layoutKey: getGallerySelectionLayoutKey(cols, rows),
        gap: getGallerySelectionGap(cols),
        useThumbnails: false,
      });
    }
    const cols = 10;
    const rows = Math.ceil(count / 10) || 10;
    return withGallerySelectionGaps({
      cols,
      rows,
      layoutCount: 100,
      layoutKey: getGallerySelectionLayoutKey(cols, rows),
      gap: getGallerySelectionGap(cols),
      useThumbnails: true,
    });
  }
  return getGallerySelectionLayout(count);
}

function readGallerySelectionCssNumber(el, propertyName, fallback) {
  const raw = getComputedStyle(el).getPropertyValue(propertyName);
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getGallerySelectionTitleFitWidth(titleEl) {
  const cell = titleEl.closest(".poster-film");
  if (!cell) return titleEl.clientWidth;
  return Math.max(1, cell.clientWidth);
}

function gallerySelectionTitleFitsAtSize(titleEl, sizePx, metrics) {
  const fitWidth = getGallerySelectionTitleFitWidth(titleEl);
  if (!titleEl || fitWidth < 1) return true;

  const { lineHeight, maxLines } = metrics;
  const maxH = sizePx * lineHeight * maxLines;

  titleEl.style.width = "100%";
  titleEl.style.maxWidth = "100%";
  titleEl.style.setProperty("--film-title-fit-size", `${sizePx}px`);
  titleEl.style.setProperty("--film-title-max-height", `${maxH.toFixed(2)}px`);
  titleEl.style.setProperty("display", "block");
  titleEl.style.setProperty("-webkit-line-clamp", "unset");
  titleEl.style.setProperty("max-height", "none");
  const naturalH = titleEl.scrollHeight;
  const naturalW = titleEl.scrollWidth;
  titleEl.style.removeProperty("display");
  titleEl.style.removeProperty("-webkit-line-clamp");
  titleEl.style.removeProperty("max-height");

  return naturalW <= fitWidth + 1 && naturalH <= maxH + 1;
}

function applyGalleryUnifiedTitleSize(grid, titles, unifiedPx, metrics) {
  const sizeValue = `${unifiedPx}px`;
  const maxH = (unifiedPx * metrics.lineHeight * metrics.maxLines).toFixed(2);

  grid.style.setProperty("--gallery-unified-title-size", sizeValue);
  titles.forEach((titleEl) => {
    titleEl.style.setProperty("--film-title-fit-size", sizeValue);
    titleEl.style.setProperty("--film-title-max-height", `${maxH}px`);
    titleEl.dataset.fitKey = `unified-${unifiedPx}`;
  });
}

function resolveGalleryUnifiedTitleSize(grid, titles) {
  if (!titles.length) return null;

  const sample = titles[0];
  const maxSize = readGallerySelectionCssNumber(sample, "--film-title-max-size", 9);
  const minSize = readGallerySelectionCssNumber(
    sample,
    "--film-title-min-size",
    Math.max(2, maxSize * 0.35)
  );
  const metrics = {
    lineHeight: readGallerySelectionCssNumber(sample, "--film-title-line-height", 1.05),
    maxLines: Math.max(
      1,
      Math.round(readGallerySelectionCssNumber(sample, "--film-title-max-lines", 2))
    ),
  };

  const allFitAtSize = (sizePx) =>
    titles.every((titleEl) => gallerySelectionTitleFitsAtSize(titleEl, sizePx, metrics));

  if (allFitAtSize(maxSize)) return { unifiedPx: maxSize, metrics };

  let low = minSize;
  let high = maxSize;
  for (let i = 0; i < 14; i++) {
    const mid = (low + high) / 2;
    if (allFitAtSize(mid)) low = mid;
    else high = mid;
  }

  return { unifiedPx: low, metrics };
}

function readPosterFilmRowGap(cell) {
  if (!cell) return 0;
  const style = getComputedStyle(cell);
  const rowGap = parseFloat(style.rowGap);
  if (Number.isFinite(rowGap) && rowGap > 0) return rowGap;
  const gap = parseFloat(style.gap);
  return Number.isFinite(gap) ? gap : 0;
}

function measurePosterFilmInfoHeight(filmInfo) {
  if (!filmInfo) return 0;
  const prevMin = filmInfo.style.minHeight;
  filmInfo.style.minHeight = "0";
  const h = filmInfo.getBoundingClientRect().height;
  if (prevMin) filmInfo.style.minHeight = prevMin;
  else filmInfo.style.removeProperty("min-height");
  return h;
}

/** Hauteur de la ligne image (1fr) dans .poster-film — espace au-dessus du bloc texte. */
function measurePosterFilmImageRowHeight(cell, filmInfo, innerGap = 0) {
  if (!cell) return 0;

  const cellRect = cell.getBoundingClientRect();
  if (filmInfo && cellRect.height > 0) {
    const infoRect = filmInfo.getBoundingClientRect();
    const fromLayout = infoRect.top - cellRect.top - innerGap;
    if (fromLayout > 1) return fromLayout;
  }

  const cellH = cell.clientHeight;
  if (!filmInfo || cellH < 1) return cellH;

  const infoH = measurePosterFilmInfoHeight(filmInfo);
  return Math.max(0, cellH - infoH - innerGap);
}

function syncGallerySelectionThumbSquares(grid) {
  if (!grid) return;

  const gridRect = grid.getBoundingClientRect();
  const gridStyle = getComputedStyle(grid);
  const colCount = Math.max(
    1,
    Number(grid.dataset.cols) ||
      parseInt(gridStyle.getPropertyValue("--poster-cols"), 10) ||
      1
  );
  const rowCount = Math.max(
    1,
    Number(grid.dataset.rows) ||
      parseInt(gridStyle.getPropertyValue("--poster-rows"), 10) ||
      1
  );
  const rowGap = parseFloat(gridStyle.rowGap) || parseFloat(gridStyle.gap) || 0;
  const estimatedRowH =
    gridRect.height > 0 ? Math.max(0, (gridRect.height - rowGap * (rowCount - 1)) / rowCount) : 0;

  grid.querySelectorAll(".poster-film").forEach((cell) => {
    const thumb = cell.querySelector(".poster-film__thumb");
    if (!thumb) return;

    const cellW = cell.clientWidth;
    const filmInfo = cell.querySelector(".film-info");
    const innerGap = readPosterFilmRowGap(cell);
    let imageRowH = measurePosterFilmImageRowHeight(cell, filmInfo, innerGap);

    if (imageRowH < 2 && estimatedRowH > 2) {
      const filmInfoH =
        filmInfo && estimatedRowH > 0 ? measurePosterFilmInfoHeight(filmInfo) : 0;
      imageRowH = Math.max(0, estimatedRowH - filmInfoH - innerGap);
    }

    const squareKey = `${cellW}x${Math.round(imageRowH)}x${colCount}`;

    if (cellW < 2 || imageRowH < 2) {
      thumb.style.removeProperty("width");
      thumb.style.removeProperty("height");
      thumb.style.removeProperty("max-width");
      thumb.style.removeProperty("max-height");
      delete thumb.dataset.squareKey;
      return;
    }

    if (thumb.dataset.squareKey === squareKey) return;

    const side = Math.floor(Math.max(0, Math.min(cellW, imageRowH)));
    if (side < 2) {
      thumb.style.removeProperty("width");
      thumb.style.removeProperty("height");
      thumb.style.removeProperty("max-width");
      thumb.style.removeProperty("max-height");
      thumb.style.removeProperty("aspect-ratio");
      delete thumb.dataset.squareKey;
      return;
    }

    thumb.dataset.squareKey = squareKey;
    const sideValue = `${side}px`;
    thumb.style.width = sideValue;
    thumb.style.height = sideValue;
    thumb.style.maxWidth = sideValue;
    thumb.style.maxHeight = sideValue;
    thumb.style.aspectRatio = "1 / 1";
  });
}

function syncGalleryUniformTitleBlockHeight(grid) {
  if (!grid) return;

  let maxH = 0;
  grid.querySelectorAll(".film-title").forEach((el) => {
    maxH = Math.max(maxH, el.getBoundingClientRect().height);
  });

  if (maxH > 0.5) {
    grid.style.setProperty("--gallery-title-block-height", `${Math.ceil(maxH)}px`);
  } else {
    grid.style.removeProperty("--gallery-title-block-height");
  }
}

/** Réserve la hauteur du bloc titre + année + cercle pour ne pas le couper sous l’image. */
function syncGalleryFilmTextReserve(grid) {
  if (!grid) return;

  let maxTextH = 0;
  grid.querySelectorAll(".poster-film .film-info").forEach((infoEl) => {
    maxTextH = Math.max(maxTextH, infoEl.scrollHeight);
  });

  if (maxTextH > 0.5) {
    grid.style.setProperty("--gallery-film-text-reserve", `${Math.ceil(maxTextH)}px`);
  } else {
    grid.style.removeProperty("--gallery-film-text-reserve");
  }
}

function syncGallerySelectionTitleMetrics(grid) {
  if (!grid) return;

  const titles = [...grid.querySelectorAll(".film-title")];
  titles.forEach((titleEl) => {
    delete titleEl.dataset.fitKey;
    titleEl.style.removeProperty("--film-title-fit-size");
    titleEl.style.removeProperty("--film-title-max-height");
  });
  grid.style.removeProperty("--gallery-title-block-height");
  grid.style.removeProperty("--gallery-film-text-reserve");
  grid.style.removeProperty("--gallery-unified-title-size");

  syncGallerySelectionThumbSquares(grid);

  const resolved = resolveGalleryUnifiedTitleSize(grid, titles);
  if (resolved) {
    applyGalleryUnifiedTitleSize(grid, titles, resolved.unifiedPx, resolved.metrics);
  }

  syncGalleryUniformTitleBlockHeight(grid);
  syncGalleryFilmTextReserve(grid);
  syncGallerySelectionThumbSquares(grid);
}

window.getGallerySelectionLayout = getGallerySelectionLayout;
window.resolveGallerySelectionLayout = resolveGallerySelectionLayout;
window.syncGallerySelectionThumbSquares = syncGallerySelectionThumbSquares;
window.syncGalleryUniformTitleBlockHeight = syncGalleryUniformTitleBlockHeight;
window.syncGalleryFilmTextReserve = syncGalleryFilmTextReserve;
window.syncGallerySelectionTitleMetrics = syncGallerySelectionTitleMetrics;
