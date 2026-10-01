import { makeMenu } from "../normalize.js";

/**
 * Adapter biip -> modelo canonico.
 *
 * Baseado na forma real observada no cliente publico do biip:
 *
 *   { "Response": { "StatusCode": 200, "StatusMessage": "OK",
 *                   "Content": { "menu": [ ... ], "unavailable_products": [ ... ] } } }
 *
 * Os produtos usam: name, description, imagem_url, price, e agrupam-se por
 * product_family_name (categoria) e product_subfamily_name (subcategoria).
 *
 * O biip pode devolver o menu ja aninhado por familia ou como lista plana.
 * As duas formas sao aceites. Campos desconhecidos sao ignorados, nunca
 * inventados.
 */
export function adaptBiip(payload) {
  const envelope = payload?.Response ?? payload?.response ?? payload;
  const content = envelope?.Content ?? envelope?.content ?? envelope;

  const unavailable = new Set(
    (content?.unavailable_products ?? []).map((v) => String(v))
  );

  const raw = content?.menu ?? content?.categories ?? content?.products ?? [];
  if (!Array.isArray(raw)) return makeMenu({ categories: [] });

  const nested = raw.some((n) => Array.isArray(n?.products ?? n?.items));
  const categories = nested ? fromNested(raw, unavailable) : fromFlat(raw, unavailable);

  return makeMenu({ currency: content?.currency, updatedAt: content?.updated_at, categories });
}

function toItem(p, unavailable) {
  const id = String(p.product_id ?? p.id ?? p.list_id ?? p.name ?? "");
  return {
    id,
    name: p.name ?? p.product_name ?? "",
    description: p.description ?? "",
    price: p.price ?? p.unit_price ?? null,
    image: p.imagem_url || p.image_url || p.image || "",
    available: p.available !== false && !unavailable.has(id),
    featured: p.highlight === true || p.featured === true,
    tags: [p.product_subfamily_name].filter(Boolean)
  };
}

function fromNested(list, unavailable) {
  return list.map((group, i) => ({
    id: String(group.product_family_code ?? group.id ?? i),
    name: group.product_family_name ?? group.name ?? group.title ?? "",
    description: group.description ?? "",
    items: (group.products ?? group.items ?? []).map((p) => toItem(p, unavailable))
  }));
}

function fromFlat(list, unavailable) {
  const buckets = new Map();
  for (const p of list) {
    const key = p.product_family_code ?? p.product_family_name ?? "outros";
    if (!buckets.has(key)) {
      buckets.set(key, {
        id: String(key),
        name: p.product_family_name ?? "",
        description: "",
        items: []
      });
    }
    buckets.get(key).items.push(toItem(p, unavailable));
  }
  return [...buckets.values()];
}

/** Erro legivel a partir do envelope do biip. */
export function biipError(payload) {
  const r = payload?.Response ?? payload?.response;
  if (r && r.StatusCode && r.StatusCode !== 200) {
    return `${r.StatusCode} ${r.StatusMessage ?? ""}`.trim();
  }
  return null;
}
