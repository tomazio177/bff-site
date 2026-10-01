/**
 * Movimento do site, com GSAP e ScrollTrigger.
 *
 * Tudo o que se mexe está aqui e passa por gsap.matchMedia(), por três
 * razões: as animações adaptam-se ao formato do ecrã, revertem-se
 * sozinhas quando o formato muda, e desaparecem por completo para quem
 * pediu menos movimento no sistema.
 *
 * Cada animação existe por um motivo declarado no comentário. Nada se
 * mexe só porque o GSAP está carregado.
 */

/* global gsap, ScrollTrigger */

const q = (sel, root = document) => root.querySelector(sel);
const qa = (sel, root = document) => [...root.querySelectorAll(sel)];

/**
 * Ordem de recalculo dos ScrollTriggers.
 *
 * Uma seccao fixada insere um espacador e empurra para baixo tudo o que
 * vem a seguir. Se uma seccao mais abaixo recalcular ANTES desse
 * espacador existir, fica com o ponto de arranque no sitio errado: era
 * isso que fazia o final colar-se ao ecra ainda a meio do "Onde estamos",
 * por cima da morada, exactamente 845 px cedo demais.
 *
 * Atencao ao sinal. A documentacao diz "lower = refreshed first", mas o
 * comportamento real do GSAP 3.13 e o contrario: recalcula primeiro quem
 * tem o numero MAIS ALTO. Foi medido no browser, com as quatro variantes,
 * e so esta funciona. Por isso o topo da pagina fica com zero e vai
 * descendo para numeros negativos.
 */
const pageOrder = (el) =>
  el ? -Math.round((el.getBoundingClientRect().top + window.scrollY) / 100) : 0;

/**
 * Ponto de arranque de uma revelação que é sempre alcançável.
 *
 * "top 88%" quer dizer: quando o topo do elemento chega a 88% da altura do
 * ecrã. Perto do fim de uma página curta, vista num ecrã alto, esse momento
 * pode ficar para lá do scroll máximo, e o elemento nunca aparecia. Foi o
 * que aconteceu ao rodapé da página da equipa.
 *
 * O clamp() do GSAP resolve o fim mas estraga o princípio: prende também o
 * limite de baixo a zero, e um elemento já visível ao abrir a página fica
 * com arranque em zero exacto, que nunca se "passa". Aqui só se limita o
 * fim: nunca depois do scroll máximo, e o princípio fica como está.
 */
const reach = (ratio) => (self) => {
  const top = self.trigger.getBoundingClientRect().top + window.scrollY;
  const natural = top - window.innerHeight * ratio;
  return Math.min(natural, ScrollTrigger.maxScroll(window) - 1);
};

/**
 * As fotografias entram com um fade curto por cima do LQIP. Sem isto
 * aparecem de golpe e a página parece saltar.
 */
export function mountPhotos() {
  // Sem ScrollTrigger.refresh() aqui, de proposito: cada .ph ja reserva a
  // sua proporcao em CSS, por isso uma imagem a chegar nao muda o layout.
  // Recalcular a meio do scroll sacudia as seccoes fixadas.
  const show = (img) => img.setAttribute("data-loaded", "");

  for (const img of qa(".ph img")) {
    if (img.complete && img.naturalWidth) show(img);
    else {
      img.addEventListener("load", () => show(img), { once: true });
      img.addEventListener("error", () => show(img), { once: true });
    }
  }
}

/**
 * Elementos que o GSAP esconde antes de os revelar. Se o motor nunca
 * chegar a correr (separador em segundo plano, erro de carregamento,
 * bloqueio de scripts), o conteudo tem de aparecer na mesma. Nenhuma
 * frase deste site pode depender de uma animacao para ser lida.
 */
const HIDEABLE = [
  ".hero__eyebrow", ".hero__mark", ".hero__tagline span", ".hero__lede", ".hero__actions > *",
  ".sobre__title", ".sobre__body p",
  ".patroa__label", ".patroa__title", ".patroa__body p", ".patroa__prompt",
  ".rail__title", ".hours__status", ".hours__row",
  ".place__title", ".place__address", ".place__actions",
  ".finale__line span", ".finale__line em", ".finale__foot",
  ".page-hero__kicker", ".page-hero__word", ".page-hero__lede", ".page-hero__count", ".page-hero__note",
  ".gallery__item", ".team-group", ".team-intro", ".team__title", ".team-card", ".xnav__item",
  ".foot__mark", ".foot__col"
].join(", ");

function revealEverything() {
  for (const el of qa(HIDEABLE)) {
    el.style.removeProperty("opacity");
    el.style.removeProperty("visibility");
    el.style.removeProperty("transform");
    el.style.removeProperty("clip-path");
  }
  for (const el of qa(".trio__shot")) el.style.removeProperty("opacity");
  qa(".trio__item")[0]?.setAttribute("data-on", "");
}

/**
 * Vigia do motor de animacao.
 *
 * A primeira versao disto verificava uma unica vez, dois segundos depois de
 * arrancar. Nao chegava: se o motor desse alguns frames e so depois parasse,
 * a verificacao passava e o conteudo ficava escondido a meio da entrada.
 *
 * Agora vigia-se durante os primeiros doze segundos e outra vez sempre que o
 * separador volta a estar a frente. Se o contador de frames ficar parado com
 * a pagina visivel, desiste-se do movimento e mostra-se tudo.
 */
function guardAgainstStalledEngine() {
  let lastFrame = gsap.ticker.frame;
  let strikes = 0;
  let done = false;

  const giveUp = () => {
    if (done) return;
    done = true;
    clearInterval(timer);
    console.warn("[bff] o motor de animacao parou, a mostrar tudo");
    revealEverything();
  };

  const tick = () => {
    if (done) return;
    if (document.hidden) { lastFrame = gsap.ticker.frame; strikes = 0; return; }
    if (gsap.ticker.frame === lastFrame) {
      strikes += 1;
      if (strikes >= 2) giveUp();       // dois intervalos seguidos sem um frame
    } else {
      strikes = 0;
      lastFrame = gsap.ticker.frame;
    }
  };

  const timer = setInterval(tick, 1200);
  setTimeout(() => { done = true; clearInterval(timer); }, 12000);

  // Ao voltar ao separador o motor devia recomecar. Se nao recomecar,
  // a proxima amostra apanha-o.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) { lastFrame = gsap.ticker.frame; strikes = 0; }
  });
}

export function mountMotion() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    revealEverything();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ duration: 0.7, ease: "power3.out" });

  // Em telemovel a barra do browser aparece e desaparece durante o scroll,
  // o que muda a altura do ecra. Sem isto, cada mudanca dessas obrigava a
  // recalcular tudo e as seccoes fixadas saltavam.
  ScrollTrigger.config({ ignoreMobileResize: true });

  const mm = gsap.matchMedia();

  mm.add(
    {
      wide: "(min-width: 900px)",
      narrow: "(max-width: 899px)",
      calm: "(prefers-reduced-motion: reduce)"
    },
    (context) => {
      const { wide, calm } = context.conditions;

      /* Quem pediu menos movimento fica com a página inteira, parada.
         Sai daqui sem criar um único ScrollTrigger. */
      if (calm) {
        // Nada foi escondido, por isso nao ha nada a repor: fixa-se a
        // primeira palavra do trio, escreve-se a tira de uma vez, e
        // deixa-se a pagina quieta.
        setActiveWord(0, true);
        fillMarquee();
        return;
      }

      heroIntro();
      heroParallax();
      trio(wide);
      reveals();
      photoDrift();
      railDrag();
      finale();
      pageHero();
      galleryReveal();
      crossNav();
      marquee();

      return () => { /* o matchMedia reverte o que foi criado aqui */ };
    }
  );

  guardAgainstStalledEngine();
  keepPositionsHonest();
}

/**
 * Mantem os pontos de arranque alinhados com a pagina real.
 *
 * Ha coisas que so chegam depois de os ScrollTriggers estarem feitos: as
 * fontes assentam, os horarios re-desenham-se com os dados verdadeiros, as
 * pastilhas do menu trocam de esqueleto para resposta. Cada uma dessas
 * mudancas altera a altura do documento, e uma seccao fixada mais abaixo
 * fica com o arranque uns pixeis cedo demais.
 *
 * Em vez de adivinhar quando isso acaba, observa-se a altura do body e
 * recalcula-se quando ela muda. Passados quinze segundos deixa-se de
 * observar: a essa altura a pagina ja assentou, e um recalculo a meio do
 * scroll e pior do que o problema que resolve.
 */
function keepPositionsHonest() {
  const refresh = () => ScrollTrigger.refresh();

  document.fonts?.ready.then(refresh);
  window.addEventListener("load", refresh, { once: true });

  if (!("ResizeObserver" in window)) return;

  let altura = document.body.offsetHeight;
  let timer = 0;

  const observer = new ResizeObserver(() => {
    const nova = document.body.offsetHeight;
    if (Math.abs(nova - altura) < 2) return;
    altura = nova;
    clearTimeout(timer);
    timer = setTimeout(refresh, 150);
  });
  observer.observe(document.body);

  setTimeout(() => { observer.disconnect(); clearTimeout(timer); }, 15000);
}

/* ------------------------------------------------------------------
   Hero
   ------------------------------------------------------------------ */

/** Entrada encenada: marca, promessa, acção. Comunica a hierarquia. */
function heroIntro() {
  const hero = q(".hero");
  if (!hero) return;

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  // A entrada tem de acabar, aconteca o que acontecer. Se ao fim de tres
  // segundos ainda la vai a meio, salta-se para o fim: mais vale a marca
  // aparecer de uma vez do que ficar meia transparente.
  const ensureFinished = setTimeout(() => {
    if (tl.progress() < 1) tl.progress(1);
  }, 3000);
  tl.eventCallback("onComplete", () => clearTimeout(ensureFinished));

  tl.from(".hero__bg", { scale: 1.12, duration: 1.8, ease: "power2.out" }, 0)
    .from(".hero__eyebrow", { autoAlpha: 0, y: 14, duration: 0.7 }, 0.15)
    .from(".hero__mark", { autoAlpha: 0, y: 26, duration: 0.9 }, 0.25)
    .from(".hero__tagline span", { autoAlpha: 0, y: 22, stagger: 0.07, duration: 0.7 }, 0.6)
    .from(".hero__lede", { autoAlpha: 0, y: 16, duration: 0.7 }, 0.85)
    .from(".hero__actions > *", { autoAlpha: 0, y: 14, stagger: 0.08, duration: 0.6 }, 0.95);
}

/** A fotografia do fundo anda mais devagar do que o texto: dá profundidade. */
function heroParallax() {
  const bg = q(".hero__bg");
  if (!bg) return;

  gsap.to(bg, {
    yPercent: 14,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
      refreshPriority: pageOrder(q(".hero"))
    }
  });
}

/* ------------------------------------------------------------------
   Trio: Beer / Food / Friends
   ------------------------------------------------------------------ */

const CAPTIONS = [
  "Cerveja fresca e o balcão cheio até tarde.",
  "Comida feita na hora, para partilhar ou não.",
  "É a parte do nome que conta mais."
];

/** Para onde leva cada palavra, e o que diz a pastilha ao lado da legenda. */
const TRIO_LINKS = [
  { href: "/beer.html", label: "Ver as bebidas" },
  { href: "/food.html", label: "Ver a comida" },
  { href: "/equipa.html", label: "Conhecer a equipa" }
];

function setTrioGo(index) {
  const go = q("[data-trio-go]");
  const label = q("[data-trio-go-label]");
  const link = TRIO_LINKS[index];
  if (!go || !link) return;
  // O destino muda logo: um toque a meio da troca de legenda tem de ir
  // para a palavra que está acesa, não para a anterior.
  go.href = link.href;
  if (label) label.textContent = link.label;
}

let activeWord = -1;

function setActiveWord(index, quiet = false) {
  if (index === activeWord) return;   // guarda: o scrub chama isto a cada frame
  activeWord = index;

  const items = qa(".trio__item");
  const caption = q("[data-trio-caption]");
  items.forEach((el, i) => el.toggleAttribute("data-on", i === index));
  setTrioGo(index);
  if (!caption) return;

  const next = CAPTIONS[index] ?? "";
  if (quiet) {
    caption.textContent = next;
    gsap.set(caption, { autoAlpha: 1, y: 0 });
    return;
  }

  // overwrite: a rolar depressa chegavam a existir varios tweens sobre a
  // mesma legenda, e o onComplete do mais antigo repunha o texto errado.
  gsap.to(caption, {
    autoAlpha: 0,
    y: 6,
    duration: 0.16,
    ease: "power2.in",
    overwrite: true,
    onComplete: () => {
      caption.textContent = CAPTIONS[activeWord] ?? "";
      gsap.to(caption, { autoAlpha: 1, y: 0, duration: 0.26, ease: "power2.out", overwrite: true });
    }
  });
}

/**
 * As três palavras ficam juntas e sempre visíveis. O scroll acende uma
 * de cada vez e troca a fotografia por trás. A distância de scroll é
 * definida aqui, não pela altura das secções, por isso o espaçamento é
 * igual em qualquer ecrã: um ecrã de scroll em telemóvel, um e meio em
 * ecrã largo. Cada palavra fica acesa exactamente o mesmo tempo.
 */
function trio(wide) {
  const section = q(".trio");
  const stage = q(".trio__stage");
  const shots = qa(".trio__shot");
  const items = qa(".trio__item");
  if (!section || !stage || !shots.length) return;

  const beats = items.length;
  // Medir o palco em vez do ecra: e a altura dele que o pin fixa, e em
  // telemovel innerHeight e 100svh nao sao o mesmo numero.
  const span = () => stage.offsetHeight * (wide ? 1.3 : 1.0);

  gsap.set(shots, { autoAlpha: 0 });
  gsap.set(shots[0], { autoAlpha: 1 });
  setActiveWord(0, true);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () => `+=${span()}`,
      pin: stage,
      pinSpacing: true,
      anticipatePin: 1,          // evita o salto ao entrar a rolar depressa
      scrub: 0.6,
      invalidateOnRefresh: true,
      refreshPriority: pageOrder(section),
      onUpdate: (self) => {
        const i = Math.min(beats - 1, Math.floor(self.progress * beats));
        setActiveWord(i);
      }
    }
  });

  // Cross-fade entre fotografias, com um empurrão de escala para a
  // câmara parecer aproximar-se a cada passagem.
  shots.forEach((shot, i) => {
    if (i === 0) return;
    tl.to(shots[i - 1], { autoAlpha: 0, duration: 0.5 }, i - 0.5)
      .to(shot, { autoAlpha: 1, duration: 0.5 }, i - 0.5);
  });
  tl.to(shots.map((s) => s.querySelector("img")), { scale: 1.1, ease: "none", duration: beats }, 0);

  // As palavras deslizam de leve, o suficiente para o bloco respirar.
  tl.to(items, { yPercent: -4, ease: "none", duration: beats }, 0);
}

/* ------------------------------------------------------------------
   Revelações e deriva
   ------------------------------------------------------------------ */

/**
 * Entrada por lote quando cada bloco chega ao ecrã. O ponto de arranque vem
 * de reach(), para nunca ficar fora do alcance do scroll.
 */
function reveals() {
  const groups = [
    ".sobre__title, .sobre__body p",
    ".patroa__label, .patroa__title, .patroa__body p, .patroa__prompt",
    ".rail__title",
    ".hours__status, .hours__row",
    ".place__title, .place__address, .place__actions",
    ".foot__mark, .foot__col"
  ];

  for (const group of groups) {
    const els = qa(group);
    if (!els.length) continue;

    const tween = gsap.from(els, {
      autoAlpha: 0,
      y: 26,
      duration: 0.75,
      stagger: 0.07,
      ease: "power3.out",
      paused: true
    });

    ScrollTrigger.create({
      trigger: els[0],
      start: reach(0.88),
      once: true,
      refreshPriority: pageOrder(els[0]),
      onEnter: () => {
        tween.play();
        // Garantia: um gsap.from com autoAlpha esconde o elemento no
        // momento em que e criado, e so o volta a mostrar quando a
        // animacao corre. Se o motor engasgar entre uma coisa e outra, o
        // texto ficava invisivel para sempre. Passados dois segundos,
        // salta-se para o fim.
        setTimeout(() => {
          if (tween.progress() < 1) tween.progress(1);
        }, 2000);
      }
    });
  }
}

/**
 * Fotografias derivam devagar dentro da moldura. As celulas do carril
 * voltaram a entrar aqui: sem pin, a posicao vertical delas muda com o
 * scroll como a de qualquer outra, e ja nao ha conflito nenhum.
 */
function photoDrift() {
  const targets = qa(".sobre__photo .ph img, .rail__cell .ph img");
  for (const img of targets) {
    gsap.fromTo(
      img,
      { yPercent: -5 },
      {
        yPercent: 5,
        ease: "none",
        scrollTrigger: {
          trigger: img.closest(".ph"),
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          refreshPriority: pageOrder(img.closest(".ph"))
        }
      }
    );
  }
}

/* ------------------------------------------------------------------
   Galeria em carril
   ------------------------------------------------------------------ */

/**
 * O carril rola na horizontal por si proprio, em qualquer ecra. Nao ha pin
 * nem conversao de scroll vertical em horizontal: isso roubava o scroll da
 * pagina e obrigava a passar pela galeria toda para continuar a ler.
 *
 * O que ha e o que ja funcionava em telemovel: um carril que se arrasta.
 * Aqui acrescenta-se arrastar com o rato, para quem nao tem trackpad, e uma
 * barra que mostra quanto falta.
 */
function railDrag() {
  const track = q(".rail__track");
  const meter = q("[data-rail-meter]");
  if (!track) return;

  const maxScroll = () => Math.max(1, track.scrollWidth - track.clientWidth);

  const paint = () => {
    if (meter) gsap.set(meter, { scaleX: track.scrollLeft / maxScroll() });
  };
  track.addEventListener("scroll", paint, { passive: true });
  paint();

  // Arrastar com o rato. O ponteiro so e capturado depois de andar uns
  // pixeis, senao um clique simples num link ficava preso.
  let dragging = false;
  let startX = 0;
  let startScroll = 0;
  let moved = false;

  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return;   // o toque ja funciona sozinho
    dragging = true;
    moved = false;
    startX = e.clientX;
    startScroll = track.scrollLeft;
  });

  track.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) < 4) return;
    if (!moved) {
      moved = true;
      track.setPointerCapture(e.pointerId);
      track.setAttribute("data-dragging", "");
    }
    track.scrollLeft = startScroll - dx;
  });

  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    if (moved) {
      track.releasePointerCapture?.(e.pointerId);
      track.removeAttribute("data-dragging");
    }
  };
  track.addEventListener("pointerup", end);
  track.addEventListener("pointercancel", end);

  // Uma imagem arrasta-se por omissao no browser e estragava o gesto.
  track.addEventListener("dragstart", (e) => e.preventDefault());
}

/* ------------------------------------------------------------------
   O final
   ------------------------------------------------------------------ */

/**
 * Acto de fecho. A pagina fixa-se uma ultima vez, o selo da casa cresce e
 * roda por tras, e a assinatura monta-se linha a linha antes de aparecer a
 * chamada para o menu. Existe para a pagina acabar num sitio, em vez de
 * simplesmente deixar de haver seccoes.
 */
function finale() {
  const section = q(".finale");
  const stage = q(".finale__stage");
  const seal = q(".finale__seal");
  const lines = qa(".finale__line span, .finale__line em");
  const foot = q(".finale__foot");
  if (!section || !stage) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () => `+=${stage.offsetHeight * 0.75}`,
      pin: stage,
      anticipatePin: 1,
      scrub: 0.7,
      invalidateOnRefresh: true,
      refreshPriority: pageOrder(section)
    }
  });

  if (seal) {
    tl.fromTo(seal,
      { scale: 0.55, rotate: -35, autoAlpha: 0 },
      { scale: 1.25, rotate: 25, autoAlpha: 0.22, ease: "none", duration: 3 }, 0);
  }

  // Cada linha entra de um lado diferente: da a assinatura montada a mao.
  lines.forEach((line, i) => {
    tl.fromTo(line,
      { yPercent: 110, autoAlpha: 0, rotate: i % 2 ? 3 : -3 },
      { yPercent: 0, autoAlpha: 1, rotate: 0, ease: "power3.out", duration: 0.9 },
      0.25 + i * 0.45);
  });

  if (foot) {
    tl.fromTo(foot,
      { y: 40, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, ease: "power3.out", duration: 0.8 },
      "-=0.3");
  }
}

/* ------------------------------------------------------------------
   Páginas Beer, Food e Equipa
   ------------------------------------------------------------------ */

/**
 * Anima e garante que acaba. Um gsap.from com autoAlpha esconde o elemento
 * no instante em que é criado; se o motor engasgar antes de a animação
 * correr, o conteúdo ficava invisível. Passado o tempo dado, salta-se para
 * o fim.
 */
function playSafely(tween, ms = 2000) {
  const timer = setTimeout(() => { if (tween.progress() < 1) tween.progress(1); }, ms);
  tween.eventCallback("onComplete", () => clearTimeout(timer));
  return tween;
}

/**
 * A palavra da página sobe de dentro de uma máscara, e a fotografia que a
 * preenche desliza devagar com o scroll. É a mesma palavra que se clicou na
 * página inicial: a entrada liga as duas páginas.
 */
function pageHero() {
  const word = q(".page-hero__word");
  if (!word) return;

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.from(".page-hero__kicker", { autoAlpha: 0, y: 12, duration: 0.6 }, 0.05)
    .fromTo(word,
      { clipPath: "inset(100% 0% 0% 0%)", yPercent: 18 },
      // No fim a máscara sai: com a entrelinha apertada do Anton, o topo das
      // letras passa ligeiramente a caixa e ficaria cortado.
      { clipPath: "inset(0% 0% 0% 0%)", yPercent: 0, duration: 1.1, ease: "power4.out", clearProps: "clipPath" }, 0.1)
    .from(".page-hero__lede", { autoAlpha: 0, y: 16, duration: 0.7 }, 0.55)
    .from(".page-hero__count, .page-hero__note", { autoAlpha: 0, y: 10, stagger: 0.08, duration: 0.6 }, 0.7);
  playSafely(tl, 3000);

  const fill = q(".page-hero__fill--foto");
  if (fill) {
    gsap.fromTo(fill, { "--hero-y": "22%" }, {
      "--hero-y": "78%",
      ease: "none",
      scrollTrigger: {
        trigger: ".page-hero",
        start: "top top",
        end: "bottom top",
        scrub: true,
        refreshPriority: pageOrder(q(".page-hero"))
      }
    });
  }
}

/**
 * As fotografias entram por lotes à medida que chegam ao ecrã. Por lotes, e
 * não uma a uma, porque numa galeria de colunas várias chegam ao mesmo
 * tempo, e em cascata leem-se como uma coisa só.
 */
function galleryReveal() {
  const items = qa(".gallery__item, .team-card");
  const blocks = qa(".team-group, .team-intro, .team__title");
  if (!items.length && !blocks.length) return;

  for (const el of blocks) {
    const tw = gsap.from(el, { autoAlpha: 0, y: 30, duration: 0.8, paused: true });
    ScrollTrigger.create({
      trigger: el,
      start: reach(0.9),
      once: true,
      refreshPriority: pageOrder(el),
      onEnter: () => playSafely(tw.play())
    });
  }

  if (!items.length) return;
  gsap.set(items, { autoAlpha: 0, y: 40 });
  ScrollTrigger.batch(items, {
    start: reach(0.94),
    once: true,
    onEnter: (batch) => playSafely(gsap.to(batch, {
      autoAlpha: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: "power3.out",
      overwrite: true
    }))
  });
}

/** As três palavras no fim da página entram de lados alternados. */
function crossNav() {
  const items = qa(".xnav__item");
  if (!items.length) return;

  const tl = gsap.timeline({ paused: true });
  items.forEach((el, i) => {
    tl.from(el, { autoAlpha: 0, x: i % 2 ? 60 : -60, duration: 0.9, ease: "power3.out" }, i * 0.12);
  });
  ScrollTrigger.create({
    trigger: ".xnav",
    start: reach(0.85),
    once: true,
    refreshPriority: pageOrder(q(".xnav")),
    onEnter: () => playSafely(tl.play())
  });
}

/* ------------------------------------------------------------------
   A tira
   ------------------------------------------------------------------ */

const MARQUEE_WORDS = ["Beer", "Food", "Friends", "Vila Real"];

/** Enche a tira com repeticoes suficientes para cobrir o ecra duas vezes. */
function fillMarquee() {
  const track = q("[data-marquee-track]");
  if (!track || track.childElementCount) return null;

  const unit = () => {
    const span = document.createElement("span");
    span.className = "marquee__unit";
    span.textContent = MARQUEE_WORDS.join(" · ") + " · ";
    return span;
  };

  // Duas metades identicas: a segunda entra enquanto a primeira sai.
  const half = document.createElement("div");
  half.className = "marquee__half";
  for (let i = 0; i < 4; i += 1) half.append(unit());
  track.append(half, half.cloneNode(true));
  return track;
}

/**
 * A tira anda sozinha e responde a velocidade do scroll: acelera com quem
 * rola e inverte o sentido quando se volta atras. Reage a leitura em vez de
 * andar sempre igual, e e a unica da pagina.
 */
function marquee() {
  const track = fillMarquee() || q("[data-marquee-track]");
  if (!track) return;

  const loop = gsap.to(track, {
    xPercent: -50,
    ease: "none",
    duration: 22,
    repeat: -1
  });

  // quickTo reaproveita um unico tween. Criar um tween novo a cada frame de
  // scroll, como estava, era trabalho a mais para nada.
  const setSpeed = gsap.quickTo(loop, "timeScale", { duration: 0.4, ease: "power2.out" });
  let direction = 1;

  ScrollTrigger.create({
    trigger: q(".marquee"),
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => {
      const v = self.getVelocity();
      if (v !== 0) direction = v < 0 ? -1 : 1;
      // clamp para um flick violento nao disparar a tira pelo ecra fora
      setSpeed(direction * gsap.utils.clamp(1, 5, 1 + Math.abs(v) / 1200));
    },
    onLeave: () => setSpeed(direction),
    onLeaveBack: () => setSpeed(direction),
    refreshPriority: pageOrder(q(".marquee"))
  });
}
