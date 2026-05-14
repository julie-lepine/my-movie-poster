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

setupImageDownloadDissuasion();
