/**
 * Peças partilhadas por todas as páginas do site.
 *
 * O site passou de duas para cinco páginas. Sem isto, a navegação e o rodapé
 * viviam copiados em cada ficheiro e bastava esquecer um para o site ficar
 * incoerente. Agora há uma fonte só, e os templates chamam-na com
 * marcadores:
 *
 *   {{NAV:inicio}}           navegação, com a página actual marcada
 *   {{FOOTER}}               rodapé
 *   {{PHOTO:id:papel}}       bloco <picture> de uma fotografia
 *   {{PHOTO:id:papel:eager}} idem, para a fotografia que abre a página
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");

export const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

export function loadPhotos() {
  const { fotos } = readJson("assets/fotos/fotos.json");
  return { list: fotos, byId: new Map(fotos.map((f) => [f.id, f])) };
}

/** Largura que a fotografia ocupa em cada breakpoint, por papel na página. */
export const SIZES = {
  cover: "100vw",
  half: "(min-width: 900px) 46vw, 100vw",
  third: "(min-width: 900px) 32vw, 82vw",
  rail: "(min-width: 900px) 34vw, 74vw",
  tile: "(min-width: 1100px) 24vw, (min-width: 700px) 32vw, 48vw",
  portrait: "(min-width: 1100px) 22vw, (min-width: 700px) 30vw, 46vw",
  wide: "(min-width: 1440px) 1360px, 94vw"
};

export function picture(photo, role, { eager = false, alt } = {}) {
  const sizes = SIZES[role];
  if (!sizes) throw new Error(`papel desconhecido: ${role}`);
  const set = (ext) => photo.widths.map((w) => `/assets/fotos/${photo.id}-${w}.${ext} ${w}w`).join(", ");
  const largest = photo.widths.at(-1);
  const loading = eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';

  return [
    `<picture class="ph" style="--ph-ratio:${photo.ratio};--ph-color:${photo.color};--ph-lqip:url('${photo.lqip}')">`,
    `<source type="image/avif" srcset="${set("avif")}" sizes="${sizes}">`,
    `<source type="image/webp" srcset="${set("webp")}" sizes="${sizes}">`,
    `<img src="/assets/fotos/${photo.id}-${largest}.jpg" srcset="${set("jpg")}" sizes="${sizes}"`,
    `width="${photo.width}" height="${photo.height}" ${loading} alt="${esc(alt ?? photo.alt)}">`,
    `</picture>`
  ].join("\n");
}

/* ------------------------------------------------------------------ */

/**
 * A navegação. "Nós" e "O espaço" saíram: são secções da página inicial que
 * o scroll já mostra, e as novas páginas precisavam do lugar.
 */
export const NAV_ITEMS = [
  { id: "menu", label: "Menu", href: "/menu.html" },
  { id: "beer", label: "Beer", href: "/beer.html" },
  { id: "food", label: "Food", href: "/food.html" },
  { id: "equipa", label: "Equipa", href: "/equipa.html" },
  { id: "horarios", label: "Horários", href: "/#horarios" },
  { id: "onde", label: "Onde estamos", href: "/#onde" }
];

const INSTAGRAM = "https://www.instagram.com/bffbeerfoodfriends/";

export function nav(current) {
  const links = NAV_ITEMS.map((item) =>
    `<a href="${item.href}"${item.id === current ? ' aria-current="page"' : ""}>${item.label}</a>`
  );

  return `<header class="nav" data-nav>
  <div class="nav__inner shell">
    <a class="nav__brand" href="/" aria-label="BFF, Beer, Food &amp; Freinds, início">
      <img src="/assets/brand/logo/bff-badge.svg" alt="" width="40" height="40" decoding="async">
      <span class="nav__brand-text">BFF</span>
    </a>

    <nav class="nav__links" aria-label="Principal">
      ${links.join("\n      ")}
    </nav>

    <a class="nav__social" href="${INSTAGRAM}"
       target="_blank" rel="noopener" aria-label="Instagram do BFF, abre noutro separador">
      <svg class="icon" aria-hidden="true"><use href="#i-instagram-logo"></use></svg>
    </a>

    <button class="nav__toggle" type="button" data-nav-toggle
            aria-expanded="false" aria-controls="nav-drawer">
      <svg class="icon" aria-hidden="true"><use href="#i-list"></use></svg>
      <span class="sr-only">Abrir navegação</span>
    </button>
  </div>

  <div class="nav__drawer" id="nav-drawer" data-nav-drawer hidden>
    ${links.join("\n    ")}
    <a href="${INSTAGRAM}" target="_blank" rel="noopener">Instagram</a>
  </div>
</header>`;
}

export function footer() {
  return `<footer class="foot">
  <div class="shell foot__grid">
    <img class="foot__mark" src="/assets/brand/logo/bff-lockup.svg"
         alt="BFF, Beer, Food &amp; Freinds" width="1222" height="568"
         loading="lazy" decoding="async">
    <div class="foot__col">
      <p>Rua DR Domingos Campos, Bloco D, loja 7<br>Nossa Sr. da Conceição, Vila Real</p>
    </div>
    <nav class="foot__col" aria-label="Rodapé">
      <a href="/menu.html">Menu</a>
      <a href="/beer.html">Beer</a>
      <a href="/food.html">Food</a>
      <a href="/equipa.html">Equipa</a>
      <a href="/#horarios">Horários</a>
      <a href="${INSTAGRAM}" target="_blank" rel="noopener">
        Instagram
        <svg class="icon icon--sm" aria-hidden="true"><use href="#i-arrow-up-right"></use></svg>
      </a>
    </nav>
  </div>
</footer>`;
}

/** Expande os marcadores de um template. */
export function expand(html, photos) {
  return html
    .replace(/<div data-icon-sprite[^>]*><\/div>/g, () => spriteTag())
    .replace(/\{\{NAV:([a-z]+)\}\}/g, (_, current) => nav(current))
    .replace(/\{\{FOOTER\}\}/g, () => footer())
    .replace(/\{\{PHOTO:([a-z0-9-]+):([a-z]+)(?::(eager))?\}\}/g, (_, id, role, eager) => {
      const photo = photos.byId.get(id);
      if (!photo) throw new Error(`fotografia desconhecida: ${id}`);
      return picture(photo, role, { eager: Boolean(eager) });
    });
}

/**
 * O sprite de ícones com a versão no endereço, tirada do próprio conteúdo.
 * O icons.js pede-o com cache agressiva; sem a versão, quem já tinha
 * visitado o site ficava com os ícones antigos depois de uma mudança.
 * Aconteceu com as setas do visualizador.
 */
export function spriteTag() {
  const svg = fs.readFileSync(path.join(ROOT, "assets", "ui", "icons.svg"));
  const v = createHash("sha1").update(svg).digest("hex").slice(0, 8);
  return `<div data-icon-sprite data-src="/assets/ui/icons.svg?v=${v}" hidden></div>`;
}
