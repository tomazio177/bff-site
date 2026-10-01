/**
 * Visualizador de fotografias.
 *
 * Usa <dialog> nativo: o browser trata do foco, do Esc e de tornar o resto
 * da página inerte enquanto está aberto. Aqui só se acrescenta navegar
 * entre fotografias (setas, teclado, arrastar no telemóvel) e devolver o
 * foco à fotografia de onde se veio.
 *
 * A fotografia ampliada é uma cópia do <picture> que já estava na galeria,
 * com um sizes maior. Assim o browser escolhe a versão grande certa sem
 * haver uma segunda lista de ficheiros para manter.
 */

/* global gsap */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

export function mountLightbox() {
  const dialog = document.querySelector("[data-lightbox]");
  const tiles = [...document.querySelectorAll("[data-lightbox-index]")];
  if (!dialog || !tiles.length) return;

  const frame = dialog.querySelector("[data-lightbox-frame]");
  const caption = dialog.querySelector("[data-lightbox-caption]");
  const count = dialog.querySelector("[data-lightbox-count]");
  const total = tiles.length;
  let index = 0;
  let opener = null;

  dialog.toggleAttribute("data-single", total === 1);

  const build = (i) => {
    const pic = tiles[i].querySelector("picture")?.cloneNode(true);
    if (!pic) return null;
    for (const el of pic.querySelectorAll("source, img")) {
      el.setAttribute("sizes", "(min-width: 900px) 84vw, 100vw");
    }
    const img = pic.querySelector("img");
    img.removeAttribute("loading");
    img.setAttribute("data-loaded", "");
    img.decoding = "async";
    return pic;
  };

  /** Pede ao browser as vizinhas, para a seguinte já estar lá quando se avança. */
  const warm = (i) => {
    const pic = build((i + total) % total);
    const img = pic?.querySelector("img");
    if (!img) return;
    const probe = new Image();
    probe.sizes = img.sizes;
    probe.srcset = img.srcset;
    probe.src = img.src;
  };

  const show = (i, direction = 0) => {
    index = (i + total) % total;
    const pic = build(index);
    if (!pic) return;
    frame.replaceChildren(pic);
    caption.textContent = tiles[index].dataset.caption || "";
    count.textContent = `${index + 1} de ${total}`;

    if (typeof gsap !== "undefined" && !REDUCED.matches) {
      gsap.fromTo(pic,
        { autoAlpha: 0, x: direction * 40, scale: direction ? 1 : 0.97 },
        { autoAlpha: 1, x: 0, scale: 1, duration: 0.35, ease: "power3.out", overwrite: true });
    }
    warm(index + 1);
    warm(index - 1);
  };

  const open = (i) => {
    opener = tiles[i];
    show(i);
    // O scroll da página fica parado por trás enquanto se vê a fotografia.
    document.documentElement.style.overflow = "hidden";
    dialog.showModal();
  };

  const close = () => dialog.close();

  dialog.addEventListener("close", () => {
    document.documentElement.style.removeProperty("overflow");
    frame.replaceChildren();
    opener?.focus({ preventScroll: true });
  });

  tiles.forEach((tile, i) => tile.addEventListener("click", () => open(i)));
  dialog.querySelector("[data-lightbox-close]")?.addEventListener("click", close);
  dialog.querySelector("[data-lightbox-prev]")?.addEventListener("click", () => show(index - 1, -1));
  dialog.querySelector("[data-lightbox-next]")?.addEventListener("click", () => show(index + 1, 1));

  dialog.addEventListener("keydown", (e) => {
    if (total < 2) return;
    if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1, 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1, -1); }
  });

  // Tocar fora da fotografia fecha. Só conta se o clique começou e acabou no
  // fundo: arrastar a fotografia e largar fora dela não fecha nada.
  let downOnBackdrop = false;
  dialog.addEventListener("pointerdown", (e) => {
    downOnBackdrop = e.target === dialog || e.target.classList.contains("lightbox__stage");
  });
  dialog.addEventListener("click", (e) => {
    const onBackdrop = e.target === dialog || e.target.classList.contains("lightbox__stage");
    if (onBackdrop && downOnBackdrop) close();
  });

  // Arrastar para o lado no telemóvel.
  let startX = null;
  frame.addEventListener("pointerdown", (e) => { startX = e.clientX; });
  frame.addEventListener("pointerup", (e) => {
    if (startX === null || total < 2) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });
  frame.addEventListener("pointercancel", () => { startX = null; });
}
