function readCartItems() {
  try {
    const value = JSON.parse(localStorage.getItem("mppCart") || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.warn("Impossible de lire le panier local.", error);
    return [];
  }
}

function writeCartItems(items) {
  localStorage.setItem("mppCart", JSON.stringify(items));
  window.updateMppCartIndicator?.();
}

function getCartItemTitle(item) {
  return item.customization?.title || "Poster personnalisé";
}

function getCartItemSubtitle(item) {
  return item.customization?.subtitle || "Création personnalisée";
}

async function ensureCartPosterImage(item, index) {
  const renderer = window.MppPosterJpeg || (await window.loadMppPosterJpeg?.());
  const version = renderer?.RENDERER_VERSION || 0;
  if (!renderer?.createPosterJpeg || (item.posterImage && item.posterImageVersion === version)) {
    return item;
  }

  try {
    const updated = { ...item };
    updated.posterImage = await renderer.createPosterJpeg(updated, {
      width: updated.type === "selection-poster" ? 1400 : 1500,
      quality: 0.88,
    });
    updated.posterImageVersion = version;

    const items = readCartItems();
    if (items[index]) {
      items[index] = updated;
      writeCartItems(items);
      renderCart();
    }
    return updated;
  } catch (error) {
    console.warn("Impossible de régénérer l'aperçu du poster.", error);
    return item;
  }
}

function getCartPosterColumnCount(item, filmCount) {
  const layoutCount = Number(item.layoutCount || filmCount);
  if (layoutCount <= 25) return 5;
  if (layoutCount <= 48) return 6;
  if (layoutCount >= 100) return 8;
  return Math.max(3, Math.ceil(Math.sqrt(filmCount || 1)));
}

function setCartTextStyle(el, customization = {}, scope) {
  const format = customization[`${scope}Format`] || {};
  const font = customization[`${scope}Font`];
  const color = customization[`${scope}Color`];
  const size = Number(customization[`${scope}Size`]);

  if (font) el.style.fontFamily = font;
  if (color) el.style.color = color;
  if (Number.isFinite(size) && size > 0) el.style.fontSize = `${size}px`;
  el.style.fontWeight = format.bold ? "900" : "";
  el.style.fontStyle = format.italic ? "italic" : "";
  el.style.textDecoration = format.strike ? "line-through" : "none";
}

function createCartThumbnail(film) {
  const img = document.createElement("img");
  img.src = film.image;
  img.alt = film.titre || "";
  img.loading = "lazy";
  img.decoding = "async";
  protectImageElement(img);
  return img;
}

function createCartPosterPreview(item) {
  const customization = item.customization || {};
  const films = item.films || [];
  const poster = document.createElement("article");
  poster.className = "cart-preview-poster-sheet";
  poster.classList.toggle("cart-preview-poster-sheet--square", item.type === "selection-poster");

  if (customization.backgroundImage) {
    poster.style.backgroundImage = `url("${String(customization.backgroundImage).replace(/"/g, '\\"')}")`;
  }

  const header = document.createElement("header");
  header.className = "cart-preview-poster-header";

  const title = document.createElement("div");
  title.className = "cart-preview-poster-title";
  title.textContent = getCartItemTitle(item);
  setCartTextStyle(title, customization, "title");

  const subtitle = document.createElement("div");
  subtitle.className = "cart-preview-poster-subtitle";
  subtitle.textContent = getCartItemSubtitle(item);
  setCartTextStyle(subtitle, customization, "subtitle");

  const grid = document.createElement("div");
  grid.className = "cart-preview-poster-grid";
  grid.style.setProperty("--cart-preview-cols", String(getCartPosterColumnCount(item, films.length)));

  films.forEach((film) => {
    const figure = document.createElement("figure");
    figure.className = "cart-preview-poster-film";

    const img = document.createElement("img");
    img.src = film.image;
    img.alt = film.titre || "";
    img.loading = "lazy";
    img.decoding = "async";
    protectImageElement(img);

    figure.appendChild(img);
    grid.appendChild(figure);
  });

  const footer = document.createElement("footer");
  footer.className = "cart-preview-poster-footer";
  const logo = document.createElement("img");
  logo.src = "./assets/site/logo.png";
  logo.alt = "My Movies Poster";
  logo.decoding = "async";
  protectImageElement(logo);
  footer.appendChild(logo);

  header.appendChild(title);
  header.appendChild(subtitle);
  poster.appendChild(header);
  poster.appendChild(grid);
  poster.appendChild(footer);

  return poster;
}

async function openCartPreview(item, index) {
  const modal = document.getElementById("cartPreviewModal");
  const content = document.getElementById("cartPreviewContent");
  if (!modal || !content) return;

  content.innerHTML = "";
  modal.hidden = false;
  content.textContent = "Préparation de l'aperçu...";
  const previewItem = await ensureCartPosterImage(item, index);

  content.innerHTML = "";
  const previewFrame = document.createElement("div");
  previewFrame.className = "cart-preview-watermark-frame";
  if (previewItem.posterImage) {
    const img = document.createElement("img");
    img.className = "cart-preview-rendered-image";
    img.src = previewItem.posterImage;
    img.alt = getCartItemTitle(previewItem);
    img.decoding = "async";
    protectImageElement(img);
    previewFrame.appendChild(img);
  } else {
    previewFrame.appendChild(createCartPosterPreview(previewItem));
  }
  content.appendChild(previewFrame);
  document.getElementById("cartPreviewClose")?.focus();
}

function closeCartPreview() {
  const modal = document.getElementById("cartPreviewModal");
  if (modal) modal.hidden = true;
}

function createCartItem(item, index) {
  const article = document.createElement("article");
  article.className = "cart-item";

  const preview = document.createElement("div");
  preview.className = "cart-item-preview";
  if (item.posterImage) {
    preview.classList.add("cart-item-preview--poster");
    const posterImg = document.createElement("img");
    posterImg.src = item.posterImage;
    posterImg.alt = getCartItemTitle(item);
    posterImg.loading = "lazy";
    posterImg.decoding = "async";
    protectImageElement(posterImg);
    preview.appendChild(posterImg);
  } else {
    const previewFilms = (item.films || []).slice(0, 9);
    previewFilms.forEach((film) => preview.appendChild(createCartThumbnail(film)));
  }

  const details = document.createElement("div");
  details.className = "cart-item-details";

  const eyebrow = document.createElement("p");
  eyebrow.className = "cart-item-eyebrow";
  eyebrow.textContent = item.type === "quiz-poster" ? "Mon Poster" : "Sélection vitrine";

  const title = document.createElement("h2");
  title.textContent = getCartItemTitle(item);

  const subtitle = document.createElement("p");
  subtitle.className = "cart-item-subtitle";
  subtitle.textContent = getCartItemSubtitle(item);

  const meta = document.createElement("p");
  meta.className = "cart-item-meta";
  const filmCount = item.films?.length || 0;
  meta.textContent = `${filmCount} film${filmCount > 1 ? "s" : ""}`;

  const actions = document.createElement("div");
  actions.className = "cart-item-actions";

  const view = document.createElement("button");
  view.type = "button";
  view.className = "cart-view-item";
  view.textContent = "Visualiser le poster";
  view.addEventListener("click", () => openCartPreview(item, index));

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "cart-remove-item";
  remove.textContent = "Retirer";
  remove.addEventListener("click", () => {
    const items = readCartItems();
    items.splice(index, 1);
    writeCartItems(items);
    renderCart();
  });

  details.appendChild(eyebrow);
  details.appendChild(title);
  details.appendChild(subtitle);
  details.appendChild(meta);
  actions.appendChild(view);
  actions.appendChild(remove);
  details.appendChild(actions);
  article.appendChild(preview);
  article.appendChild(details);

  return article;
}

function renderCart() {
  const root = document.getElementById("cartItems");
  const summary = document.getElementById("cartSummary");
  const clearAll = document.getElementById("cartClearAll");
  if (!root) return;

  const items = readCartItems();
  root.innerHTML = "";

  if (summary) {
    summary.textContent = items.length
      ? `${items.length} poster${items.length > 1 ? "s" : ""} dans ton panier.`
      : "Ton panier est vide.";
  }
  if (clearAll) clearAll.hidden = items.length === 0;

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "cart-empty";
    empty.innerHTML = `
      <p>Aucun poster dans ton panier pour le moment.</p>
      <a href="vitrine.html">Découvrir la vitrine</a>
      <a href="mon-poster.html">Générer un poster</a>
    `;
    root.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    fragment.appendChild(createCartItem(item, index));
  });
  root.appendChild(fragment);
}

document.getElementById("cartClearAll")?.addEventListener("click", () => {
  writeCartItems([]);
  renderCart();
});

document.getElementById("cartPreviewClose")?.addEventListener("click", closeCartPreview);

document.getElementById("cartPreviewModal")?.addEventListener("click", (event) => {
  if (event.target.id === "cartPreviewModal") closeCartPreview();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCartPreview();
});

renderCart();
