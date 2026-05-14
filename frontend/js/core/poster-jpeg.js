(function () {
  const RENDERER_VERSION = 2;
  const imageCache = new Map();
  const DEFAULT_BACKGROUND = "assets/img/backgrounds/bg.png";
  const LOGO_SRC = "./assets/site/logo.png";
  const CIRCLE_SRC = "./assets/site/circle.png";

  function readTitle(item) {
    return item.customization?.title || "Poster personnalisé";
  }

  function readSubtitle(item) {
    return item.customization?.subtitle || "Création personnalisée";
  }

  function loadImage(src) {
    if (!src) return Promise.resolve(null);
    if (imageCache.has(src)) return imageCache.get(src);

    const promise = new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

    imageCache.set(src, promise);
    return promise;
  }

  function drawImageCover(ctx, img, x, y, width, height) {
    if (!img || !width || !height) return;
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const drawWidth = img.naturalWidth * scale;
    const drawHeight = img.naturalHeight * scale;
    ctx.drawImage(img, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function drawImageContain(ctx, img, x, y, width, height) {
    if (!img || !width || !height) return;
    const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
    const drawWidth = img.naturalWidth * scale;
    const drawHeight = img.naturalHeight * scale;
    ctx.drawImage(img, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function firstFontFamily(fontStack, fallback = "Montserrat, Arial, sans-serif") {
    return String(fontStack || fallback).split(",")[0].trim() || fallback;
  }

  function clampNumber(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function applyTextFont(ctx, customization, scope, size, fallbackWeight) {
    const format = customization?.[`${scope}Format`] || {};
    const fontFamily = firstFontFamily(customization?.[`${scope}Font`]);
    const weight = format.bold ? "900" : fallbackWeight;
    const style = format.italic ? "italic" : "normal";
    ctx.font = `${style} ${weight} ${size}px ${fontFamily}`;
    return format;
  }

  function wrapText(ctx, text, maxWidth, maxLines) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";

    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !line) {
        line = next;
      } else {
        lines.push(line);
        line = word;
      }
    });
    if (line) lines.push(line);

    if (lines.length > maxLines) {
      const clipped = lines.slice(0, maxLines);
      let last = clipped[clipped.length - 1];
      while (last.length > 1 && ctx.measureText(`${last}...`).width > maxWidth) {
        last = last.slice(0, -1);
      }
      clipped[clipped.length - 1] = `${last}...`;
      return clipped;
    }
    return lines;
  }

  function drawCenteredText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const lines = wrapText(ctx, text, maxWidth, maxLines);
    lines.forEach((line, index) => {
      ctx.fillText(line, x, y + index * lineHeight);
    });
    return lines.length * lineHeight;
  }

  function drawFormatStrike(ctx, format, x, y, width, fontSize) {
    if (!format?.strike) return;
    ctx.save();
    ctx.lineWidth = Math.max(2, fontSize * 0.06);
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y - fontSize * 0.3);
    ctx.lineTo(x + width / 2, y - fontSize * 0.3);
    ctx.stroke();
    ctx.restore();
  }

  function getQuizLayout(count) {
    if (count <= 25) return { cols: 5, rows: 5, gap: 18 };
    if (count <= 48) return { cols: 6, rows: 8, gap: 18 };
    return { cols: 8, rows: Math.ceil(count / 8), gap: 14 };
  }

  function getSelectionColumnCount(count) {
    if (count <= 1) return 1;
    if (count <= 4) return 2;
    if (count <= 9) return 3;
    if (count <= 16) return 4;
    if (count <= 25) return 5;
    return 6;
  }

  function getSelectionRowHeight(columnCount, scale) {
    if (columnCount <= 1) return 210 * scale;
    if (columnCount <= 2) return 168 * scale;
    if (columnCount <= 3) return 136 * scale;
    if (columnCount <= 4) return 116 * scale;
    if (columnCount <= 5) return 104 * scale;
    return 92 * scale;
  }

  function drawPosterChrome(ctx, width, height, customization) {
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(0, 0, width, height);
    return loadImage(customization?.backgroundImage || DEFAULT_BACKGROUND).then((bg) => {
      if (bg) drawImageCover(ctx, bg, 0, 0, width, height);
    });
  }

  function drawHeader(ctx, item, x, y, width, customization, scale) {
    const titleSize = clampNumber(
      Number(customization?.titleSize || 34) * scale,
      18 * scale,
      Math.min(width * 0.085, 44 * scale)
    );
    const subtitleSize = clampNumber(
      Number(customization?.subtitleSize || 22) * scale,
      9 * scale,
      Math.min(width * 0.045, 18 * scale)
    );
    const centerX = x + width / 2;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = customization?.titleColor || "#25272d";
    const titleFormat = applyTextFont(ctx, customization, "title", titleSize, "900");
    const titleTop = y;
    drawCenteredText(ctx, readTitle(item).toUpperCase(), centerX, titleTop, width, titleSize * 1.08, 2);
    drawFormatStrike(ctx, titleFormat, centerX, titleTop + titleSize * 0.72, Math.min(width, ctx.measureText(readTitle(item)).width), titleSize);

    ctx.fillStyle = customization?.subtitleColor || "#3d4152";
    const subtitleFormat = applyTextFont(ctx, customization, "subtitle", subtitleSize, "700");
    const subtitleTop = titleTop + titleSize * 1.28;
    drawCenteredText(ctx, readSubtitle(item).toUpperCase(), centerX, subtitleTop, width, subtitleSize * 1.16, 2);
    drawFormatStrike(ctx, subtitleFormat, centerX, subtitleTop + subtitleSize * 0.72, Math.min(width, ctx.measureText(readSubtitle(item)).width), subtitleSize);
    ctx.restore();
  }

  function drawFilmInfo(ctx, film, x, y, width, maxHeight, scale, compact) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const circleSize = compact
      ? clampNumber(maxHeight * 0.2, 7, width * 0.1)
      : clampNumber(maxHeight * 0.18, 10, width * 0.1);
    return loadImage(CIRCLE_SRC).then((circle) => {
      if (circle) drawImageContain(ctx, circle, x + (width - circleSize) / 2, y, circleSize, circleSize);

      const titleSize = compact
        ? clampNumber(maxHeight * 0.22, 7, Math.min(width * 0.1, maxHeight * 0.28))
        : clampNumber(maxHeight * 0.2, 10, Math.min(width * 0.12, maxHeight * 0.28));
      ctx.fillStyle = "#31343c";
      ctx.font = `600 ${titleSize}px Arial, sans-serif`;
      const titleTop = y + circleSize + Math.max(2, titleSize * 0.28);
      const lines = wrapText(ctx, film.titre || "", width, compact ? 2 : 3);
      lines.forEach((line, index) => {
        ctx.fillText(line, x + width / 2, titleTop + index * titleSize * 1.08);
      });

      const yearTop = Math.min(y + maxHeight - titleSize * 1.2, titleTop + lines.length * titleSize * 1.08 + 2 * scale);
      ctx.fillStyle = "#5c606b";
      ctx.font = `500 ${clampNumber(titleSize * 0.72, 6, maxHeight * 0.18)}px Arial, sans-serif`;
      ctx.fillText(film.year || "", x + width / 2, yearTop);
      ctx.restore();
    });
  }

  async function drawFilmGrid(ctx, films, gridRect, layout, scale) {
    const { cols, rows, gap } = layout;
    const cellWidth = (gridRect.width - gap * (cols - 1)) / cols;
    const cellHeight = (gridRect.height - gap * (rows - 1)) / rows;
    const compact = cols >= 6;

    for (let index = 0; index < films.length; index++) {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = gridRect.x + col * (cellWidth + gap);
      const y = gridRect.y + row * (cellHeight + gap);
      const infoHeight = compact ? Math.min(cellHeight * 0.34, 62 * scale) : Math.min(cellHeight * 0.32, 92 * scale);
      const imageHeight = Math.max(1, cellHeight - infoHeight - 5 * scale);
      const img = await loadImage(films[index].image);
      drawImageContain(ctx, img, x, y, cellWidth, imageHeight);
      await drawFilmInfo(ctx, films[index], x, y + imageHeight + 5 * scale, cellWidth, infoHeight, scale, compact);
    }
  }

  async function drawFooter(ctx, width, y, footerHeight, scale) {
    ctx.save();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = Math.max(1, 1 * scale);
    ctx.beginPath();
    ctx.moveTo(width * 0.08, y);
    ctx.lineTo(width * 0.92, y);
    ctx.stroke();
    ctx.restore();

    const logo = await loadImage(LOGO_SRC);
    const logoWidth = Math.min(width * 0.34, 420 * scale);
    const logoHeight = footerHeight * 0.62;
    drawImageContain(ctx, logo, (width - logoWidth) / 2, y + footerHeight * 0.2, logoWidth, logoHeight);
  }

  async function renderQuizPoster(item, options) {
    const width = options.width || 1500;
    const height = Math.round(width * 594 / 420);
    const scale = width / 420;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const customization = item.customization || {};
    const films = item.films || [];

    await drawPosterChrome(ctx, width, height, customization);

    const padding = 26 * scale;
    const headerHeight = 54 * scale;
    const footerHeight = 42 * scale;
    drawHeader(ctx, item, padding, padding, width - padding * 2, customization, scale);
    await drawFooter(ctx, width, height - padding - footerHeight, footerHeight, scale);

    const layout = getQuizLayout(films.length || item.layoutCount || 100);
    const gridY = padding + headerHeight + 18 * scale;
    const gridHeight = height - gridY - footerHeight - padding * 2;
    await drawFilmGrid(ctx, films, {
      x: padding,
      y: gridY,
      width: width - padding * 2,
      height: gridHeight,
    }, layout, scale);

    return canvas.toDataURL("image/jpeg", options.quality || 0.88);
  }

  async function renderSelectionPoster(item, options) {
    const width = options.width || 1400;
    const scale = width / 340;
    const films = item.films || [];
    const cols = getSelectionColumnCount(films.length);
    const rows = Math.max(1, Math.ceil(films.length / cols));
    const rowHeight = getSelectionRowHeight(cols, scale);
    const padding = 14 * scale;
    const headerHeight = 46 * scale;
    const footerHeight = Math.min(42 * scale, Math.max(26 * scale, (rowHeight * rows) / 10));
    const gap = 5 * scale;
    const height = Math.round(padding * 2 + headerHeight + rowHeight * rows + gap * (rows - 1) + footerHeight + 22 * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const customization = item.customization || {};

    await drawPosterChrome(ctx, width, height, customization);
    drawHeader(ctx, item, padding, padding, width - padding * 2, customization, scale);

    await drawFilmGrid(ctx, films, {
      x: padding,
      y: padding + headerHeight,
      width: width - padding * 2,
      height: rowHeight * rows + gap * (rows - 1),
    }, { cols, rows, gap }, scale);

    await drawFooter(ctx, width, height - padding - footerHeight, footerHeight, scale);

    return canvas.toDataURL("image/jpeg", options.quality || 0.88);
  }

  async function createPosterJpeg(item, options = {}) {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    if (item.type === "selection-poster") {
      return renderSelectionPoster(item, options);
    }
    return renderQuizPoster(item, options);
  }

  window.MppPosterJpeg = {
    RENDERER_VERSION,
    createPosterJpeg,
  };
})();
