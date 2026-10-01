/**
 * Gera as páginas do site.
 *
 *   node tools/build-pages.mjs        (ou: npm run build, que corre as fotos antes)
 *
 *   tools/index.template.html  ->  index.html
 *   tools/menu.template.html   ->  menu.html
 *   data/galerias.json         ->  beer.html, food.html
 *   data/equipa.json           ->  equipa.html
 *
 * As galerias são escritas em HTML estático a partir de
 * assets/fotos/fotos.json: as fotografias aparecem mesmo sem JavaScript, e o
 * JavaScript só acrescenta o movimento e o visualizador.
 */

import fs from "node:fs";
import path from "node:path";
import { ROOT, esc, readJson, loadPhotos, picture, nav, footer, expand, spriteTag } from "./lib/layout.mjs";

const photos = loadPhotos();
const galerias = readJson("data/galerias.json");
const equipa = readJson("data/equipa.json");
const PREVIEW = galerias.preview === true;
const INSTAGRAM = "https://www.instagram.com/bffbeerfoodfriends/";

const write = (file, html) => {
  fs.writeFileSync(path.join(ROOT, file), html);
  console.log(`escrito ${file}`);
};

/* ------------------------------------------------------------------
   Páginas com template
   ------------------------------------------------------------------ */

for (const [template, out] of [["index.template.html", "index.html"], ["menu.template.html", "menu.html"]]) {
  const src = fs.readFileSync(path.join(ROOT, "tools", template), "utf8");
  write(out, expand(src, photos));
}

/* ------------------------------------------------------------------
   Peças das páginas de galeria
   ------------------------------------------------------------------ */

/** Proporções dos quadrados vazios: variadas, para a pré-visualização
    parecer uma galeria a sério e não uma grelha de caixas iguais. */
const EMPTY_RATIOS = [0.8, 1, 0.75, 1.25, 0.8, 0.667, 1, 0.8, 1.333, 0.75, 0.8, 1];

const emptyTile = (i, label = "Foto por chegar") => `
        <li class="gallery__item gallery__item--vazio" aria-hidden="true">
          <div class="tile-vazio" style="--ph-ratio:${EMPTY_RATIOS[i % EMPTY_RATIOS.length]}">
            <img src="/assets/brand/logo/bff-badge.svg" alt="" width="560" height="559" loading="lazy" decoding="async">
            <span>${label}</span>
          </div>
        </li>`;

const photoTile = (photo, index) => `
        <li class="gallery__item">
          <figure class="tile">
            <button class="tile__open" type="button" data-lightbox-index="${index}"
                    data-caption="${esc(photo.legenda ?? "")}" aria-label="Ampliar: ${esc(photo.alt)}">
              ${picture(photo, "tile").replaceAll("\n", "\n              ")}
              <span class="tile__zoom" aria-hidden="true"><svg class="icon"><use href="#i-arrows-out-simple"></use></svg></span>
            </button>${photo.legenda ? `
            <figcaption class="tile__caption">${esc(photo.legenda)}</figcaption>` : ""}
          </figure>
        </li>`;

function wordMarkup(palavra) {
  // O & fica dourado, como no resto do site.
  return esc(palavra).replace(/^&amp;\s*/, '<span class="page-hero__amp">&amp;</span>&nbsp;');
}

function hero(page, { count, countLabel, heroPhoto, placeholders }) {
  const img = heroPhoto ? `/assets/fotos/${heroPhoto.id}-${heroPhoto.widths.find((w) => w >= 700) ?? heroPhoto.widths.at(-1)}.jpg` : null;
  const len = page.palavra.replace(/\s+/g, "").length;
  const style = [`--word-len:${len}`, img ? `--hero-img:url('${img}')` : null].filter(Boolean).join(";");
  const countText = countLabel ?? (count === 0 ? "Fotografias a caminho" : `${count} ${count === 1 ? "fotografia" : "fotografias"}`);

  return `
  <section class="page-hero" style="${style}">
    <div class="page-hero__glow" aria-hidden="true"></div>
    <div class="shell page-hero__inner">
      <p class="eyebrow page-hero__kicker">${esc(page.etiqueta)}</p>
      <h1 class="page-hero__word">
        <span class="sr-only">${esc(page.palavra)}: ${esc(page.etiqueta)}</span>
        <span class="page-hero__fill${img ? " page-hero__fill--foto" : ""}" aria-hidden="true">${wordMarkup(page.palavra)}</span>
      </h1>
      <p class="page-hero__lede">${esc(page.lede)}</p>
      ${countText ? `<p class="page-hero__count">${esc(countText)}</p>` : ""}${PREVIEW && placeholders > 0 ? `
      <p class="page-hero__note">Pré-visualização. Os quadrados marcados "Foto por chegar"
         são o sítio das fotografias que ainda vão entrar.</p>` : ""}
    </div>
  </section>`;
}

function crossNav(current) {
  const items = [
    { id: "beer", html: "Beer", href: "/beer.html" },
    { id: "food", html: "Food", href: "/food.html" },
    { id: "equipa", html: '<span class="xnav__amp">&amp;</span>&nbsp;Friends', href: "/equipa.html" }
  ];
  return `
  <nav class="xnav" aria-label="Beer, Food and Friends">
    <div class="shell">
      <ul class="xnav__list">${items.map((it) => `
        <li><a class="xnav__item" href="${it.href}"${it.id === current ? ' aria-current="page"' : ""}>
          <span class="xnav__word">${it.html}</span>
          <svg class="icon xnav__arrow" aria-hidden="true"><use href="#i-arrow-up-right"></use></svg>
          ${it.id === current ? '<span class="xnav__here">está aqui</span>' : ""}
        </a></li>`).join("")}
      </ul>
    </div>
  </nav>`;
}

const LIGHTBOX = `
<dialog class="lightbox" data-lightbox aria-label="Fotografia ampliada">
  <div class="lightbox__stage">
    <div class="lightbox__frame" data-lightbox-frame></div>
    <p class="lightbox__caption" data-lightbox-caption></p>
  </div>
  <p class="lightbox__count" data-lightbox-count aria-live="polite"></p>
  <button class="lightbox__btn lightbox__close" type="button" data-lightbox-close>
    <svg class="icon" aria-hidden="true"><use href="#i-x"></use></svg><span class="sr-only">Fechar</span>
  </button>
  <button class="lightbox__btn lightbox__prev" type="button" data-lightbox-prev>
    <svg class="icon" aria-hidden="true"><use href="#i-caret-left"></use></svg><span class="sr-only">Fotografia anterior</span>
  </button>
  <button class="lightbox__btn lightbox__next" type="button" data-lightbox-next>
    <svg class="icon" aria-hidden="true"><use href="#i-caret-right"></use></svg><span class="sr-only">Fotografia seguinte</span>
  </button>
</dialog>`;

function layout(id, page, { main, ogPhoto, lightbox }) {
  const og = ogPhoto ? `/assets/fotos/${ogPhoto.id}-${ogPhoto.widths.at(-1)}.jpg` : "/assets/brand/og.png";
  return `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(page.titulo)}</title>
<meta name="description" content="${esc(page.descricao)}">
<meta name="theme-color" content="#0c0b0a">
<link rel="canonical" href="/${page.ficheiro}">

<meta property="og:type" content="website">
<meta property="og:site_name" content="BFF, Beer, Food &amp; Freinds">
<meta property="og:title" content="${esc(page.titulo)}">
<meta property="og:description" content="${esc(page.descricao)}">
<meta property="og:locale" content="pt_PT">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">

<link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml">

<link rel="preload" href="/assets/fonts/anton-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>

<link rel="stylesheet" href="/css/tokens.css">
<link rel="stylesheet" href="/css/base.css">
<link rel="stylesheet" href="/css/site.css">
<link rel="stylesheet" href="/css/story.css">
<link rel="stylesheet" href="/css/galeria.css">

<script>document.documentElement.classList.add("js");</script>
</head>

<!-- Gerado por tools/build-pages.mjs a partir de data/galerias.json.
     Não editar à mão: as alterações perdem-se no próximo build. -->
<body class="page-galeria page-${id}">
<a class="skip-link" href="#conteudo">Saltar para o conteúdo</a>
<div class="grain" aria-hidden="true"></div>

${nav(id)}

<main id="conteudo">
${main}
${crossNav(id)}

  <div class="marquee" data-marquee aria-hidden="true">
    <div class="marquee__track" data-marquee-track></div>
  </div>
</main>

${footer()}
${lightbox ? LIGHTBOX : ""}

${spriteTag()}

<script src="/assets/vendor/gsap.min.js" defer></script>
<script src="/assets/vendor/ScrollTrigger.min.js" defer></script>
<script type="module" src="/js/galeria-page.js"></script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------
   Beer e Food
   ------------------------------------------------------------------ */

for (const id of ["beer", "food"]) {
  const page = galerias.paginas[id];
  const list = photos.list.filter((p) => p.categoria === page.categoria);
  const placeholders = PREVIEW ? Math.max(0, page.minimo - list.length) : 0;
  const heroPhoto = photos.byId.get(page.heroFoto) ?? list[0] ?? null;

  const tiles = [
    ...list.map((p, i) => photoTile(p, i)),
    ...Array.from({ length: placeholders }, (_, i) => emptyTile(i))
  ];

  const body = list.length || placeholders
    ? `
  <section class="gallery-wrap" aria-label="Fotografias: ${esc(page.etiqueta)}">
    <div class="shell">
      <ul class="gallery" data-gallery>${tiles.join("")}
      </ul>
    </div>
  </section>`
    : `
  <section class="gallery-wrap">
    <div class="shell gallery-empty">
      <p>As fotografias estão a caminho.</p>
      <a class="btn btn--ghost" href="${INSTAGRAM}" target="_blank" rel="noopener">
        <svg class="icon" aria-hidden="true"><use href="#i-instagram-logo"></use></svg>
        Ver no Instagram
      </a>
    </div>
  </section>`;

  write(page.ficheiro, layout(id, page, {
    main: hero(page, { count: list.length, heroPhoto, placeholders }) + body,
    ogPhoto: heroPhoto,
    lightbox: list.length > 0
  }));
}

/* ------------------------------------------------------------------
   Equipa
   ------------------------------------------------------------------ */

{
  const page = galerias.paginas.equipa;
  const idFor = (file) => file ? `equipa-${file.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}` : null;

  // A de grupo aceita qualquer extensão: grupo.jpg, grupo.png...
  const grupo = photos.byId.get(idFor(equipa.grupo?.foto)) ?? null;

  const membros = (equipa.membros ?? []).filter((m) => m.nome).map((m) => {
    const photo = photos.byId.get(idFor(m.foto));
    if (m.foto && !photo) console.warn(`equipa: não encontro a fotografia ${m.foto} de ${m.nome}`);
    return { ...m, photo };
  });

  const referenced = new Set([grupo?.id, ...membros.map((m) => m.photo?.id)].filter(Boolean));
  for (const p of photos.list.filter((p) => p.categoria === "equipa" && !referenced.has(p.id))) {
    console.warn(`equipa: ${p.file} não está em data/equipa.json, fica de fora`);
  }

  const placeholders = PREVIEW ? Math.max(0, page.minimo - membros.length) : 0;

  const groupFigure = grupo
    ? `
      <figure class="team-group">
        <button class="tile__open" type="button" data-lightbox-index="0"
                data-caption="${esc(equipa.grupo.legenda ?? "")}" aria-label="Ampliar: ${esc(grupo.alt)}">
          ${picture(grupo, "wide").replaceAll("\n", "\n          ")}
        </button>${equipa.grupo.legenda ? `
        <figcaption class="tile__caption">${esc(equipa.grupo.legenda)}</figcaption>` : ""}
      </figure>`
    : PREVIEW
      ? `
      <figure class="team-group" aria-hidden="true">
        <div class="tile-vazio tile-vazio--grupo">
          <img src="/assets/brand/logo/bff-badge.svg" alt="" width="560" height="559" loading="lazy" decoding="async">
          <span>Fotografia de grupo por chegar</span>
        </div>
      </figure>`
      : "";

  const intro = equipa.texto
    ? `\n      <p class="team-intro">${esc(equipa.texto)}</p>`
    : PREVIEW
      ? `\n      <p class="team-intro team-intro--vazio">Duas linhas sobre a equipa, por escrever.
         Preencher <code>texto</code> em <code>data/equipa.json</code>.</p>`
      : "";

  const card = (m) => `
        <li class="team-card">
          <div class="team-card__photo">${m.photo
            ? picture(m.photo, "portrait", { alt: [m.nome, m.papel].filter(Boolean).join(", ") })
            : `<div class="tile-vazio" style="--ph-ratio:0.8"><span>Sem fotografia</span></div>`}</div>
          <p class="team-card__name">${esc(m.nome)}</p>${m.papel ? `
          <p class="team-card__role">${esc(m.papel)}</p>` : ""}
        </li>`;

  const emptyCard = () => `
        <li class="team-card team-card--vazio" aria-hidden="true">
          <div class="team-card__photo">
            <div class="tile-vazio" style="--ph-ratio:0.8">
              <img src="/assets/brand/logo/bff-badge.svg" alt="" width="560" height="559" loading="lazy" decoding="async">
              <span>Foto por chegar</span>
            </div>
          </div>
          <p class="team-card__name">Nome</p>
          <p class="team-card__role">Função</p>
        </li>`;

  const cards = [...membros.map(card), ...Array.from({ length: placeholders }, emptyCard)];

  const main = hero(page, {
    count: membros.length,
    countLabel: membros.length ? `${membros.length} ${membros.length === 1 ? "pessoa" : "pessoas"}` : "",
    heroPhoto: photos.byId.get(page.heroFoto) ?? grupo,
    placeholders: placeholders + (grupo ? 0 : 1)
  }) + `
  <section class="team-top" aria-label="A equipa">
    <div class="shell">${groupFigure}${intro}
    </div>
  </section>${cards.length ? `

  <section class="team" aria-labelledby="team-title">
    <div class="shell">
      <h2 class="team__title" id="team-title">Quem cá está</h2>
      <ul class="team__grid">${cards.join("")}
      </ul>
    </div>
  </section>` : ""}`;

  write(page.ficheiro, layout("equipa", page, { main, ogPhoto: grupo, lightbox: Boolean(grupo) }));
}
