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
}

function getCartItemTitle(item) {
  return item.customization?.title || "Poster personnalisé";
}

function getCartItemSubtitle(item) {
  return item.customization?.subtitle || "Création personnalisée";
}

function createCartThumbnail(film) {
  const img = document.createElement("img");
  img.src = film.image;
  img.alt = film.titre || "";
  img.loading = "lazy";
  return img;
}

function createCartItem(item, index) {
  const article = document.createElement("article");
  article.className = "cart-item";

  const preview = document.createElement("div");
  preview.className = "cart-item-preview";
  const previewFilms = (item.films || []).slice(0, 9);
  previewFilms.forEach((film) => preview.appendChild(createCartThumbnail(film)));

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
  details.appendChild(remove);
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
    `;
    root.appendChild(empty);
    return;
  }

  items.forEach((item, index) => {
    root.appendChild(createCartItem(item, index));
  });
}

document.getElementById("cartClearAll")?.addEventListener("click", () => {
  writeCartItems([]);
  renderCart();
});

renderCart();
