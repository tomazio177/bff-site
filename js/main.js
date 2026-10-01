import { mountIcons } from "./icons.js";
import { mountNav } from "./nav.js";
import { mountHours } from "./hours.js";
import { mountPhotos, mountMotion } from "./motion.js";
import { loadMenu } from "./menu/client.js";

/** Lê os dados factuais. É a única fonte de verdade do site. */
async function loadSite() {
  try {
    const res = await fetch("/data/site.json", { cache: "no-cache" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Alinha os links externos com data/site.json. O HTML já traz os valores
 * actuais, por isso a página funciona na mesma se o ficheiro falhar.
 */
function applyLinks(site) {
  if (!site) return;
  const maps = site.maps?.url;
  if (maps) document.querySelectorAll("[data-maps-link]").forEach((a) => { a.href = maps; });
  const ig = site.instagram?.url;
  if (ig) document.querySelectorAll('a[href*="instagram.com"]').forEach((a) => { a.href = ig; });
}

/**
 * A história da patroa. Enquanto owner.story for null, fica o convite a
 * escrever. Nunca se escreve a história de uma pessoa real por ela.
 */
function mountOwner(site) {
  const body = document.querySelector("[data-owner-story]");
  const prompt = document.querySelector("[data-owner-prompt]");
  if (!body || !prompt) return;

  const story = site?.owner?.story;
  const paragraphs = Array.isArray(story) ? story : story ? [story] : [];
  if (!paragraphs.length) return;

  body.replaceChildren(
    ...paragraphs.map((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      return p;
    })
  );
  body.hidden = false;
  prompt.remove();
}

/**
 * Pré-visualização do menu na página inicial. Tem os quatro estados:
 * a carregar, com dados, vazio e erro. Nunca inventa categorias.
 */
async function mountMenuPreview() {
  const box = document.querySelector("[data-menu-preview]");
  if (!box) return;

  const chips = box.querySelector("[data-menu-chips]");
  const msg = box.querySelector("[data-menu-msg]");
  const setState = (state) => box.setAttribute("data-state", state);

  try {
    const { menu, demo } = await loadMenu();

    if (!menu.categories.length) {
      setState("empty");
      chips.replaceChildren();
      msg.textContent = "O menu está a ser actualizado. Volte dentro de momentos.";
      return;
    }

    setState("ready");
    const shown = menu.categories.slice(0, 6);
    chips.replaceChildren(
      ...shown.map((c) => {
        const el = document.createElement("span");
        el.className = "chip";
        el.textContent = c.name;
        return el;
      })
    );
    const rest = menu.categories.length - shown.length;
    msg.textContent = demo
      ? "Dados de demonstração. Não são o menu real do BFF."
      : rest > 0
        ? `Mais ${rest} no menu completo.`
        : "";
  } catch (err) {
    setState("error");
    chips.replaceChildren();
    msg.textContent = err.message;
    console.warn("[bff] menu:", err.detail || err.message);
  }
}

async function boot() {
  mountIcons();
  mountNav();
  mountPhotos();
  mountMotion();

  const site = await loadSite();
  applyLinks(site);
  mountOwner(site);
  if (site) mountHours(site);

  mountMenuPreview();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
