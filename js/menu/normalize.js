/**
 * Modelo canonico do menu usado por toda a interface.
 *
 *   Menu     { currency, updatedAt, categories[] }
 *   Category { id, name, description, items[] }
 *   Item     { id, name, description, price, image, available, featured, tags[] }
 *
 * Qualquer adapter novo tem de devolver exatamente esta forma. A interface
 * nunca le campos crus da API.
 */

export const EMPTY_MENU = Object.freeze({
  currency: "EUR",
  updatedAt: null,
  categories: []
});

const str = (v) => (typeof v === "string" ? v.trim() : "");
const num = (v) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return null;
};

export function makeItem(raw) {
  return {
    id: str(raw.id) || str(raw.name).toLowerCase().replace(/\s+/g, "-"),
    name: str(raw.name),
    description: str(raw.description),
    price: num(raw.price),
    image: str(raw.image) || null,
    available: raw.available !== false,
    featured: raw.featured === true,
    tags: Array.isArray(raw.tags) ? raw.tags.map(str).filter(Boolean) : []
  };
}

export function makeMenu(raw) {
  const categories = (Array.isArray(raw.categories) ? raw.categories : [])
    .map((c, i) => ({
      id: str(c.id) || `cat-${i}`,
      name: str(c.name),
      description: str(c.description),
      items: (Array.isArray(c.items) ? c.items : []).map(makeItem).filter((it) => it.name)
    }))
    .filter((c) => c.name && c.items.length);

  return {
    currency: str(raw.currency) || "EUR",
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : null,
    categories
  };
}

export function formatPrice(value, currency = "EUR", locale = "pt-PT") {
  if (value === null || value === undefined) return null;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}
