import { MENU_SOURCE } from "./config.js";
import { adaptBiip, biipError } from "./adapters/biip.js";
import { makeMenu, EMPTY_MENU } from "./normalize.js";

const CACHE_KEY = "bff:menu:v1";
let inflight = null;

const ADAPTERS = {
  biip: adaptBiip,
  passthrough: (payload) => makeMenu(payload)
};

/**
 * O `message` é o que a pessoa lê na página, por isso é sempre uma frase
 * inteira em português. O detalhe técnico fica em `detail`, só para a
 * consola de quem mantém o site.
 */
export class MenuUnavailable extends Error {
  constructor(message, { detail = "", cause } = {}) {
    super(message);
    this.name = "MenuUnavailable";
    this.detail = detail;
    this.cause = cause;
  }
}

function isDemo() {
  return new URLSearchParams(location.search).get("demo") === "1";
}

function readCache() {
  try {
    const hit = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    if (hit && Date.now() - hit.t < MENU_SOURCE.cacheMs) return hit.v;
  } catch { /* cache corrompida, ignorar */ }
  return null;
}

function writeCache(value) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), v: value }));
  } catch { /* storage cheia ou bloqueada, seguir sem cache */ }
}

function endpoint() {
  if (isDemo()) return { url: MENU_SOURCE.demoUrl, adapter: "passthrough", demo: true };
  if (MENU_SOURCE.mode === "static") return { url: MENU_SOURCE.staticUrl, adapter: MENU_SOURCE.adapter };
  if (MENU_SOURCE.mode === "proxy") return { url: MENU_SOURCE.proxyUrl, adapter: MENU_SOURCE.adapter };
  return null;
}

/**
 * Devolve { menu, demo, cached } ou lança MenuUnavailable.
 * Desenhar os estados de carregamento, erro e vazio é da interface.
 */
export async function loadMenu({ force = false } = {}) {
  const target = endpoint();
  if (!target) {
    throw new MenuUnavailable("O menu ainda não está ligado a nenhuma fonte de dados.", {
      detail: "MENU_SOURCE.mode === 'off'"
    });
  }

  if (!force && !target.demo) {
    const cached = readCache();
    if (cached) return { menu: makeMenu(cached), demo: false, cached: true };
  }
  if (inflight) return inflight;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MENU_SOURCE.timeoutMs);

  inflight = (async () => {
    let res;
    try {
      res = await fetch(target.url, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
    } catch (err) {
      throw new MenuUnavailable(
        err.name === "AbortError"
          ? "O serviço do menu demorou demasiado a responder."
          : "Não conseguimos falar com o serviço do menu.",
        { detail: `fetch ${target.url}: ${err.name}`, cause: err }
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new MenuUnavailable(
        res.status === 501
          ? "O menu ainda não está ligado ao serviço do BFF."
          : "O serviço do menu não respondeu como esperado.",
        { detail: `HTTP ${res.status} em ${target.url}` }
      );
    }

    let payload;
    try {
      payload = await res.json();
    } catch (err) {
      throw new MenuUnavailable("A resposta do serviço do menu não é válida.", {
        detail: "JSON inválido",
        cause: err
      });
    }

    const upstream = biipError(payload);
    if (upstream) {
      throw new MenuUnavailable("O serviço do menu não respondeu como esperado.", { detail: upstream });
    }

    const adapt = ADAPTERS[target.adapter] ?? ADAPTERS.passthrough;
    const menu = adapt(payload);
    if (!target.demo) writeCache(menu);
    return { menu, demo: Boolean(target.demo), cached: false };
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export { EMPTY_MENU };
