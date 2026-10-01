/**
 * Injecta o sprite de ícones (Phosphor, MIT) uma única vez por página.
 * Um pedido pequeno em vez de catorze, e nenhum path desenhado à mão.
 */
let done = false;

export async function mountIcons() {
  if (done) return;
  const host = document.querySelector("[data-icon-sprite]");
  if (!host) return;
  try {
    // O endereço traz a versão do conteúdo (posta pelo build), por isso a
    // cache agressiva é segura: um sprite novo tem um endereço novo.
    const src = host.dataset.src || "/assets/ui/icons.svg";
    const res = await fetch(src, { cache: "force-cache" });
    if (!res.ok) return;
    host.innerHTML = await res.text();
    done = true;
  } catch {
    /* Sem ícones a página continua legível: todos têm rótulo em texto. */
  }
}
