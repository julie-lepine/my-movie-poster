// Comportements communs légers, chargés sur toutes les pages.

function protectImageElement(img) {
  if (!img) return;
  img.draggable = false;
  img.setAttribute("draggable", "false");
}

function setupImageDownloadDissuasion() {
  document.querySelectorAll("img").forEach(protectImageElement);

  document.addEventListener(
    "contextmenu",
    (event) => {
      if (event.target.closest?.("img")) {
        event.preventDefault();
      }
    },
    true
  );

  document.addEventListener(
    "dragstart",
    (event) => {
      if (event.target.closest?.("img")) {
        event.preventDefault();
      }
    },
    true
  );

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (node.matches?.("img")) protectImageElement(node);
        node.querySelectorAll?.("img").forEach(protectImageElement);
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function readMppCartCount() {
  try {
    const cart = JSON.parse(localStorage.getItem("mppCart") || "[]");
    return Array.isArray(cart) ? cart.length : 0;
  } catch (error) {
    console.warn("Impossible de lire le nombre d'articles du panier.", error);
    return 0;
  }
}

function updateMppCartIndicator() {
  const count = readMppCartCount();
  const badges = document.querySelectorAll("[data-cart-count]");

  badges.forEach((badge) => {
    badge.hidden = count === 0;
    badge.textContent = count > 99 ? "99+" : String(count);
  });

  document.querySelectorAll(".site-account-link--cart").forEach((link) => {
    link.classList.toggle("has-cart-items", count > 0);
    link.setAttribute(
      "aria-label",
      count > 0 ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier"
    );
  });
}

window.updateMppCartIndicator = updateMppCartIndicator;

window.addEventListener("storage", (event) => {
  if (event.key === "mppCart") updateMppCartIndicator();
});

setupImageDownloadDissuasion();
updateMppCartIndicator();
