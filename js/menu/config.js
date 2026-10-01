/**
 * Configuracao da fonte de dados do menu.
 *
 * O menu NUNCA e escrito a mao no frontend. Vem sempre de uma fonte externa.
 *
 * O que se sabe sobre a API do biip (verificado no bundle publico de
 * app.biip.pt, nao assumido):
 *   - Base:    POST https://api.biip.pt/v1/<endpoint>
 *   - Headers: X-BIIP-APIKEY, X-BIIP-SIGNATURE (HMAC do corpo), X-BIIP-CLIENT
 *   - Envelope: { "Response": { "StatusCode", "StatusMessage", "Content" } }
 *   - Modelo de produto: name, description, imagem_url, price,
 *     product_family_name, product_subfamily_name, unavailable_products
 *
 * Como a assinatura HMAC exige um segredo, a chamada NAO pode ser feita a
 * partir do browser sem expor credenciais. Por isso o modo recomendado e
 * "proxy": o browser chama /api/menu neste dominio e a funcao serverless
 * em api/menu.js assina o pedido do lado do servidor.
 */

export const MENU_SOURCE = {
  /**
   * "proxy"  - chama endpoint deste dominio, que assina e reencaminha (recomendado)
   * "static" - chama um ficheiro JSON servido estaticamente
   * "off"    - nao chama nada; a pagina mostra o estado "indisponivel"
   */
  mode: "proxy",

  /** Endpoint usado quando mode === "proxy". */
  proxyUrl: "/api/menu",

  /** Endpoint usado quando mode === "static". */
  staticUrl: "/data/menu.json",

  /**
   * Adapter que normaliza a resposta. "biip" entende o envelope do biip.
   * "passthrough" aceita ja o formato normalizado (ver normalize.js).
   */
  adapter: "biip",

  /** Tempo maximo de espera, em ms, antes de mostrar o estado de erro. */
  timeoutMs: 9000,

  /** Cache em memoria + sessionStorage, em ms. */
  cacheMs: 5 * 60 * 1000,

  /**
   * Demonstracao local. Ativa-se apenas com ?demo=1 no URL e a interface
   * mostra sempre um aviso visivel. Nunca substitui dados reais.
   */
  demoUrl: "/data/menu.demo.json"
};
