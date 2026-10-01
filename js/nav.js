/**
 * Barra de navegação: fundo sólido quando sai do topo, gaveta em telemóvel.
 * O estado "colado" vem de um IntersectionObserver sobre uma sentinela,
 * não de um listener de scroll.
 */
export function mountNav() {
  const nav = document.querySelector("[data-nav]");
  if (!nav) return;

  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:1px;";
  document.body.prepend(sentinel);

  const io = new IntersectionObserver(
    ([entry]) => nav.toggleAttribute("data-stuck", !entry.isIntersecting),
    { rootMargin: "-8px 0px 0px 0px" }
  );
  io.observe(sentinel);

  const toggle = nav.querySelector("[data-nav-toggle]");
  const drawer = nav.querySelector("[data-nav-drawer]");
  if (!toggle || !drawer) return;

  const setOpen = (open) => {
    drawer.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector("use")?.setAttribute("href", open ? "#i-x" : "#i-list");
    toggle.querySelector(".sr-only").textContent = open ? "Fechar navegação" : "Abrir navegação";
  };

  toggle.addEventListener("click", () => setOpen(drawer.hidden));
  drawer.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !drawer.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });

  const wide = window.matchMedia("(min-width: 900px)");
  wide.addEventListener("change", (e) => {
    if (e.matches) setOpen(false);
  });
}
