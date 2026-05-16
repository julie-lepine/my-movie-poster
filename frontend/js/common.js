// Comportements communs légers, chargés sur toutes les pages.

function protectImageElement(img) {
  if (!img) return;
  img.draggable = false;
  if (!img.decoding || img.decoding === "auto") img.decoding = "async";
  img.setAttribute("draggable", "false");
}

function setupImageDownloadDissuasion() {
  document.querySelectorAll("header img, footer img, .site-services img").forEach(protectImageElement);

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

var mppPosterJpegLoadPromise = null;

function loadMppPosterJpeg() {
  if (window.MppPosterJpeg?.createPosterJpeg) {
    return Promise.resolve(window.MppPosterJpeg);
  }

  if (!mppPosterJpegLoadPromise) {
    mppPosterJpegLoadPromise = new Promise((resolve, reject) => {
      const loadScript = (src) =>
        new Promise((res, rej) => {
          const script = document.createElement("script");
          script.src = src;
          script.defer = true;
          script.onload = () => res();
          script.onerror = () => rej(new Error(`Impossible de charger ${src}.`));
          document.head.appendChild(script);
        });

      const start = window.getGallerySelectionLayout
        ? Promise.resolve()
        : loadScript("js/core/gallery-selection-layout.js");

      start
        .then(() => loadScript("js/core/poster-jpeg.js"))
        .then(() => resolve(window.MppPosterJpeg))
        .catch(reject);
    });
  }

  return mppPosterJpegLoadPromise;
}

window.updateMppCartIndicator = updateMppCartIndicator;
window.loadMppPosterJpeg = loadMppPosterJpeg;

window.addEventListener("storage", (event) => {
  if (event.key === "mppCart") updateMppCartIndicator();
});

setupImageDownloadDissuasion();
updateMppCartIndicator();
