import { formatPrice } from "./normalize.js";

/**
 * Desenho do menu. Quatro estados, todos tratados: a carregar, com dados,
 * vazio e erro. Nada aqui conhece a API: recebe sempre o modelo canónico.
 */

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** Esqueleto com a forma do resultado final, não um círculo a girar. */
export function renderLoading(host, categories = 3, items = 5) {
  host.setAttribute("data-state", "loading");
  host.replaceChildren(
    ...Array.from({ length: categories }, () => {
      const section = el("section", "cat");
      section.append(el("div", "cat__title skel skel--title"));
      const list = el("ul", "cat__list");
      for (let i = 0; i < items; i += 1) {
        const li = el("li", "item");
        const body = el("div", "item__body");
        body.append(el("div", "skel skel--line"), el("div", "skel skel--line skel--short"));
        li.append(body, el("div", "skel skel--price"));
        list.append(li);
      }
      section.append(list);
      return section;
    })
  );
}

export function renderError(host, message, onRetry) {
  host.setAttribute("data-state", "error");
  const box = el("div", "state");
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "state__icon");
  icon.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", "#i-wifi-slash");
  icon.append(use);

  box.append(icon, el("h2", "state__title", "Menu indisponível de momento"));
  box.append(el("p", "state__body", message));

  const retry = el("button", "btn", "Tentar novamente");
  retry.type = "button";
  retry.addEventListener("click", onRetry);
  box.append(retry);

  host.replaceChildren(box);
}

export function renderEmpty(host) {
  host.setAttribute("data-state", "empty");
  const box = el("div", "state");
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "state__icon");
  icon.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", "#i-fork-knife");
  icon.append(use);

  box.append(icon, el("h2", "state__title", "Menu a ser actualizado"));
  box.append(el("p", "state__body", "Ainda não há itens publicados. Assim que forem, aparecem aqui."));
  host.replaceChildren(box);
}

function renderItem(item, currency) {
  const li = el("li", "item");
  if (!item.available) li.setAttribute("data-unavailable", "");

  if (item.image) {
    const img = el("img", "item__img");
    img.src = item.image;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 88;
    img.height = 88;
    // Sem invenção de fotografias: se a imagem falhar, sai da composição.
    img.addEventListener("error", () => img.remove(), { once: true });
    li.append(img);
  }

  const body = el("div", "item__body");
  const head = el("p", "item__name", item.name);
  if (item.featured) head.append(el("span", "item__flag", "Destaque"));
  body.append(head);
  if (item.description) body.append(el("p", "item__desc", item.description));
  if (!item.available) body.append(el("p", "item__out", "Indisponível"));
  li.append(body);

  const price = formatPrice(item.price, currency);
  if (price) li.append(el("p", "item__price", price));

  return li;
}

export function renderMenu(host, menu, { demo = false } = {}) {
  host.setAttribute("data-state", "ready");
  const frag = document.createDocumentFragment();

  if (demo) {
    const warn = el("p", "demo-flag",
      "Dados de demonstração. Não são o menu real do BFF.");
    frag.append(warn);
  }

  for (const cat of menu.categories) {
    const section = el("section", "cat");
    section.id = `cat-${cat.id}`;
    section.setAttribute("aria-labelledby", `h-${cat.id}`);

    const title = el("h2", "cat__title", cat.name);
    title.id = `h-${cat.id}`;
    section.append(title);
    if (cat.description) section.append(el("p", "cat__desc", cat.description));

    const list = el("ul", "cat__list");
    for (const item of cat.items) list.append(renderItem(item, menu.currency));
    section.append(list);
    frag.append(section);
  }

  host.replaceChildren(frag);
}

/** Barra de categorias. Rola na horizontal, encaixa, e marca a activa. */
let catnavObserver = null;

export function renderCategoryNav(host, menu) {
  // Cada desenho substitui o anterior: sem observadores acumulados.
  catnavObserver?.disconnect();
  catnavObserver = null;

  if (!menu.categories.length) {
    host.replaceChildren();
    host.hidden = true;
    return;
  }
  host.hidden = false;
  host.replaceChildren(
    ...menu.categories.map((cat) => {
      const a = el("a", "chip catnav__chip", cat.name);
      a.href = `#cat-${cat.id}`;
      return a;
    })
  );

  const links = new Map(
    [...host.querySelectorAll("a")].map((a) => [a.getAttribute("href").slice(1), a])
  );
  catnavObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const link = links.get(entry.target.id);
        if (!link) continue;
        link.toggleAttribute("data-current", entry.isIntersecting);
      }
    },
    { rootMargin: "-30% 0px -60% 0px" }
  );
  menu.categories.forEach((cat) => {
    const section = document.getElementById(`cat-${cat.id}`);
    if (section) catnavObserver.observe(section);
  });
}
