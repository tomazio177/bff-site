import { mountIcons } from "./icons.js";
import { mountNav } from "./nav.js";
import { mountPhotos, mountMotion } from "./motion.js";
import { loadMenu } from "./menu/client.js";
import { renderLoading, renderError, renderEmpty, renderMenu, renderCategoryNav } from "./menu/render.js";

const host = document.querySelector("[data-menu-root]");
const catnav = document.querySelector("[data-menu-catnav]");
const stamp = document.querySelector("[data-menu-stamp]");

async function show({ force = false } = {}) {
  if (!host) return;
  renderLoading(host);
  if (catnav) catnav.hidden = true;

  try {
    const { menu, demo, cached } = await loadMenu({ force });

    if (!menu.categories.length) {
      renderEmpty(host);
      if (catnav) catnav.hidden = true;
      if (stamp) stamp.textContent = "";
      return;
    }

    renderMenu(host, menu, { demo });
    if (catnav) renderCategoryNav(catnav, menu);

    if (stamp) {
      const total = menu.categories.reduce((n, c) => n + c.items.length, 0);
      const when = menu.updatedAt
        ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(menu.updatedAt)
        : null;
      stamp.textContent = [
        `${total} ${total === 1 ? "item" : "itens"} em ${menu.categories.length} categorias`,
        when ? `actualizado a ${when}` : null,
        cached ? "em cache" : null
      ].filter(Boolean).join(" · ");
    }
  } catch (err) {
    renderError(host, err.message, () => show({ force: true }));
    if (catnav) catnav.hidden = true;
    if (stamp) stamp.textContent = "";
    console.warn("[bff] menu:", err.detail || err.message);
  }
}

function boot() {
  mountIcons();
  mountNav();
  mountPhotos();
  mountMotion();
  show();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
