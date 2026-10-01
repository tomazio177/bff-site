/**
 * Proxy do menu: assina o pedido ao biip do lado do servidor.
 *
 * Porque existe: a API do biip exige um HMAC do corpo do pedido feito com um
 * segredo. Esse segredo nao pode viver no browser. O browser chama
 * /api/menu (sem credenciais) e esta funcao chama o biip.
 *
 * Handler no formato Vercel / Next.js Route Handlers. Para Netlify ou
 * Cloudflare Workers muda so a assinatura da funcao; a logica e a mesma.
 *
 * Variaveis de ambiente necessarias (pedir ao biip: info@biip.pt):
 *   BIIP_API_KEY     -> header X-BIIP-APIKEY
 *   BIIP_API_SECRET  -> chave do HMAC
 *   BIIP_CLIENT      -> header X-BIIP-CLIENT
 *   BIIP_ENDPOINT    -> caminho depois de /v1/ (ex.: "menu")
 *   BIIP_STORE       -> identificador da loja BFF no biip
 *
 * Opcionais:
 *   BIIP_BASE_URL    -> por omissao https://api.biip.pt/v1/
 *   BIIP_SIG_ENCODING-> "hex" (por omissao) ou "base64"
 *   BIIP_CACHE_SECONDS -> por omissao 300
 *
 * Enquanto as credenciais nao existirem, responde 501 e o site mostra o
 * estado "menu indisponivel". Nunca devolve dados inventados.
 */

import { createHmac } from "node:crypto";

const BASE = process.env.BIIP_BASE_URL || "https://api.biip.pt/v1/";
const CACHE_SECONDS = Number(process.env.BIIP_CACHE_SECONDS || 300);

function missingConfig() {
  return ["BIIP_API_KEY", "BIIP_API_SECRET", "BIIP_CLIENT", "BIIP_ENDPOINT", "BIIP_STORE"]
    .filter((k) => !process.env[k]);
}

export default async function handler(request, response) {
  const send = (status, body, headers = {}) => {
    if (typeof response?.status === "function") {
      response.status(status);
      for (const [k, v] of Object.entries(headers)) response.setHeader(k, v);
      return response.json(body);
    }
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...headers }
    });
  };

  const missing = missingConfig();
  if (missing.length) {
    return send(501, {
      error: "biip_not_configured",
      message: "Credenciais do biip por definir.",
      missing
    });
  }

  const body = { store: process.env.BIIP_STORE, language: "pt" };
  const payload = JSON.stringify(body);

  const signature = createHmac("sha256", process.env.BIIP_API_SECRET)
    .update(payload, "utf8")
    .digest(process.env.BIIP_SIG_ENCODING === "base64" ? "base64" : "hex");

  let upstream;
  try {
    upstream = await fetch(BASE + process.env.BIIP_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BIIP-APIKEY": process.env.BIIP_API_KEY,
        "X-BIIP-SIGNATURE": signature,
        "X-BIIP-CLIENT": process.env.BIIP_CLIENT
      },
      body: payload,
      signal: AbortSignal.timeout(8000)
    });
  } catch (err) {
    return send(502, { error: "biip_unreachable", message: String(err?.message || err) });
  }

  if (!upstream.ok) {
    return send(502, { error: "biip_error", status: upstream.status });
  }

  let data;
  try {
    data = await upstream.json();
  } catch {
    return send(502, { error: "biip_bad_json" });
  }

  return send(200, data, {
    "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600`
  });
}

/**
 * NOTA sobre a assinatura, para quem falar com o biip:
 * o cliente publico do biip calcula HMAC-SHA256 sobre o corpo JSON usando o
 * segredo como chave e envia o resultado em X-BIIP-SIGNATURE. A codificacao
 * exata do digest (hex ou base64) deve ser confirmada com o biip; e o unico
 * detalhe do protocolo que nao e possivel determinar sem credenciais.
 */
