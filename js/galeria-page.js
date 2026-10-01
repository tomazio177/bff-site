import { mountIcons } from "./icons.js";
import { mountNav } from "./nav.js";
import { mountPhotos, mountMotion } from "./motion.js";
import { mountLightbox } from "./lightbox.js";

/** Arranque das páginas Beer, Food e Equipa. */
function boot() {
  mountIcons();
  mountNav();
  mountPhotos();
  mountMotion();
  mountLightbox();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
