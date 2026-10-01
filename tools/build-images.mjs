/**
 * Prepara as fotografias do BFF para a web.
 *
 *   node tools/build-images.mjs
 *
 * Duas origens de fotografias:
 *
 *   1. As seis originais, listadas em LEGACY, que o index.html usa pelo nome.
 *   2. Tudo o que estiver dentro das pastas de categoria:
 *
 *        fotos-originais/beer/     bebidas, bar, cerveja
 *        fotos-originais/food/     comida
 *        fotos-originais/equipa/   a equipa (grupo.jpg e a fotografia de grupo)
 *
 *      Basta largar lá os ficheiros. A ordem na galeria é a ordem alfabética
 *      dos nomes, por isso 01-..., 02-... controla quem aparece primeiro.
 *      Um legendas.json opcional na pasta dá texto alternativo e legenda:
 *
 *        { "01-francesinha.jpg": { "alt": "Francesinha no prato", "legenda": "A francesinha" } }
 *
 * Para cada fotografia escreve em assets/fotos/ AVIF, WebP e JPEG em cada
 * largura útil, mais um LQIP e a cor média, e regista tudo em
 * assets/fotos/fotos.json, que é o que as páginas lêem.
 *
 * Só reprocessa o que mudou, e apaga os ficheiros gerados de fotografias
 * que já não existem nos originais.
 *
 * Precisa de sharp:  npm install sharp
 */

import sharp from "sharp";
import fs from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "fotos-originais");
const OUT = path.join(ROOT, "assets", "fotos");
const MANIFEST = path.join(OUT, "fotos.json");

/** As categorias que têm pasta própria e página própria. */
const CATEGORIES = ["beer", "food", "equipa"];

/**
 * Texto alternativo quando não há legendas.json. Genérico de propósito:
 * descreve o que é verdade sobre a fotografia sem inventar o que lá está.
 */
const DEFAULT_ALT = {
  beer: "Bebidas no BFF",
  food: "Comida do BFF",
  equipa: "Equipa do BFF"
};

/** As seis originais. O index.html refere-se a elas pelo id. */
const LEGACY = [
  { id: "sala", file: "sala.png", categoria: "casa", crop: null,
    alt: "Sala do BFF cheia, pessoas à conversa ao balcão com canecas de cerveja" },
  { id: "bar", file: "bar.png", categoria: "beer", crop: null,
    alt: "O balcão do BFF, com o letreiro luminoso food and friends por cima das garrafas",
    legenda: "O balcão" },
  { id: "garrafeira", file: "garrafeira.png", categoria: "beer",
    crop: { left: 16, top: 0, right: 0, bottom: 0 },
    alt: "Prateleiras de whisky e copos de pé suspensos por cima do balcão",
    legenda: "A garrafeira" },
  { id: "balcao", file: "balcao.png", categoria: "beer", crop: null,
    alt: "Cocktail a ser servido no balcão, copo cheio de gelo",
    legenda: "Ao serviço" },
  { id: "cocktails", file: "cocktails.png", categoria: "beer", crop: null,
    alt: "Dois cocktails no tabuleiro, um com fatia de ananás",
    legenda: "Os cocktails" },
  { id: "hamburguer", file: "hamburguer.png", categoria: "food", crop: null,
    alt: "Hambúrguer com queijo derretido e batatas, servido em prato de louça",
    legenda: "O hambúrguer" }
];

const WIDTHS = [480, 760, 1120, 1600];
const JPEG = { quality: 82, mozjpeg: true, chromaSubsampling: "4:4:4" };
const WEBP = { quality: 80, effort: 5 };
const AVIF = { quality: 52, effort: 5 };
const INPUT = /\.(jpe?g|png|webp|avif|tiff?)$/i;

const slug = (name) =>
  name
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

/** Lê as pastas de categoria e devolve as entradas novas, por ordem. */
async function discover() {
  const found = [];
  for (const categoria of CATEGORIES) {
    const dir = path.join(SRC, categoria);
    if (!existsSync(dir)) continue;

    const legendas = await readJson(path.join(dir, "legendas.json"), {});
    const files = (await fs.readdir(dir))
      .filter((f) => INPUT.test(f))
      .sort((a, b) => a.localeCompare(b, "pt", { numeric: true }));

    for (const file of files) {
      const meta = legendas[file] ?? {};
      found.push({
        id: `${categoria}-${slug(file)}`,
        file: path.join(categoria, file),
        categoria,
        crop: meta.crop ?? null,
        alt: meta.alt ?? DEFAULT_ALT[categoria],
        legenda: meta.legenda ?? null
      });
    }
  }
  return found;
}

/** Os ficheiros gerados de uma fotografia existem e são mais novos do que o original? */
function isFresh(photo, previous, sourceFile) {
  if (!previous) return false;
  const largest = previous.widths?.at(-1);
  if (!largest) return false;
  const outputs = ["avif", "webp", "jpg"].map((ext) => path.join(OUT, `${photo.id}-${largest}.${ext}`));
  if (!outputs.every(existsSync)) return false;
  const srcTime = statSync(sourceFile).mtimeMs;
  return outputs.every((o) => statSync(o).mtimeMs >= srcTime) &&
    JSON.stringify(previous.crop ?? null) === JSON.stringify(photo.crop ?? null);
}

async function processPhoto(photo, sourceFile) {
  // rotate() sem argumentos aplica a orientação EXIF: fotografias de
  // telemóvel vêm muitas vezes deitadas sem isto.
  let pipeline = sharp(sourceFile).rotate();
  const oriented = await pipeline.toBuffer({ resolveWithObject: true });
  let base = oriented.data;
  let width = oriented.info.width;
  let height = oriented.info.height;

  if (photo.crop) {
    const { left = 0, top = 0, right = 0, bottom = 0 } = photo.crop;
    width -= left + right;
    height -= top + bottom;
    base = await sharp(base).extract({ left, top, width, height }).toBuffer();
  }

  // Nunca ampliar: as larguras param na resolução do original, e a
  // resolução nativa entra como a maior variante quando é menor do que 1600.
  const widths = [...new Set([...WIDTHS.filter((w) => w < width), Math.min(width, WIDTHS.at(-1))])]
    .sort((a, b) => a - b);

  for (const w of widths) {
    const resized = () => sharp(base).resize({ width: w, withoutEnlargement: true });
    await resized().avif(AVIF).toFile(path.join(OUT, `${photo.id}-${w}.avif`));
    await resized().webp(WEBP).toFile(path.join(OUT, `${photo.id}-${w}.webp`));
    await resized().jpeg(JPEG).toFile(path.join(OUT, `${photo.id}-${w}.jpg`));
  }

  // LQIP: 20 px de largura, desfocado, embutido como data URI.
  const lqipBuf = await sharp(base).resize({ width: 20 }).blur(1.4).webp({ quality: 40 }).toBuffer();

  // Cor média dos canais: melhor fundo do que a cor dominante, que em
  // fotografia escura tende a colapsar para preto puro.
  const { channels } = await sharp(base).stats();
  const color = `#${channels.slice(0, 3)
    .map((c) => Math.round(c.mean).toString(16).padStart(2, "0"))
    .join("")}`;

  const largest = widths.at(-1);
  return {
    width: largest,
    height: Math.round(largest * (height / width)),
    ratio: +(width / height).toFixed(4),
    widths,
    lqip: `data:image/webp;base64,${lqipBuf.toString("base64")}`,
    color
  };
}

async function build() {
  await fs.mkdir(OUT, { recursive: true });
  const previous = new Map(((await readJson(MANIFEST, {})).fotos ?? []).map((f) => [f.id, f]));

  // As novas primeiro: vêm dos ficheiros originais, com melhor resolução do
  // que as capturas de ecrã antigas, que ficam no fim de cada galeria.
  const photos = [...(await discover()), ...LEGACY];

  const seen = new Set();
  const manifest = [];
  let processed = 0;
  let reused = 0;

  for (const photo of photos) {
    if (seen.has(photo.id)) {
      console.warn(`id repetido, a saltar: ${photo.id} (${photo.file})`);
      continue;
    }
    seen.add(photo.id);

    const source = path.join(SRC, photo.file);
    if (!existsSync(source)) {
      console.warn(`falta o original: ${photo.file}, a saltar`);
      continue;
    }

    const old = previous.get(photo.id);
    let media;
    if (isFresh(photo, old, source)) {
      media = { width: old.width, height: old.height, ratio: old.ratio, widths: old.widths, lqip: old.lqip, color: old.color };
      reused += 1;
    } else {
      media = await processPhoto(photo, source);
      processed += 1;
      console.log(`${photo.id.padEnd(28)} ${media.width}x${media.height}  ${media.widths.join(", ")}`);
    }

    manifest.push({
      id: photo.id,
      categoria: photo.categoria,
      file: photo.file.replaceAll("\\", "/"),
      alt: photo.alt,
      legenda: photo.legenda ?? null,
      crop: photo.crop ?? null,
      ...media
    });
  }

  // Apagar o que foi gerado para fotografias que já não existem.
  const keep = new Set(manifest.flatMap((p) => p.widths.flatMap((w) => ["avif", "webp", "jpg"].map((e) => `${p.id}-${w}.${e}`))));
  let removed = 0;
  for (const f of await fs.readdir(OUT)) {
    if (!/-\d+\.(avif|webp|jpg)$/.test(f) || keep.has(f)) continue;
    await fs.unlink(path.join(OUT, f));
    removed += 1;
  }

  await fs.writeFile(
    MANIFEST,
    JSON.stringify({ _aviso: "Gerado por tools/build-images.mjs. Não editar à mão.", fotos: manifest }, null, 2)
  );

  const byCat = manifest.reduce((acc, p) => ((acc[p.categoria] = (acc[p.categoria] ?? 0) + 1), acc), {});
  console.log(`\n${manifest.length} fotografias (${processed} processadas, ${reused} reaproveitadas, ${removed} ficheiros apagados)`);
  console.log(Object.entries(byCat).map(([k, v]) => `  ${k}: ${v}`).join("\n"));
}

build().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
