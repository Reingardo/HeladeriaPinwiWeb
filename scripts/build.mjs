import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { families } from '../src/js/catalog.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const cards = families.map((family, i) => `<article class="card family-card" data-family="${i}" style="--c:${family.color};--i:${i}">
  <p class="card-category mono">${family.products.length} SABORES</p>
  <h3 class="disp">${escape(family.name)}</h3>
  <div class="spr pk" role="img" aria-label="Imagen de referencia de ${escape(family.name)}" style="background-image:url('${family.image}');--aspect:${family.photoAspect || .475}"></div>
  <button class="poke-hit" aria-label="Explorar ${escape(family.name)}"></button>
  <span class="card-price mono">Desde $${family.price}<small>MXN / PIEZA</small></span>
  <button class="add" aria-label="Ver sabores de ${escape(family.name)}">↗</button>
</article>`).join('\n');
await mkdir(new URL('../dist/js/', import.meta.url), { recursive: true });
let html = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
html = html.replace('<!-- FAMILY_CARDS -->', cards);
await writeFile(new URL('../dist/index.html', import.meta.url), html);
await cp(new URL('../src/js/', import.meta.url), new URL('../dist/js/', import.meta.url), { recursive: true });
await cp(new URL('../src/styles.css', import.meta.url), new URL('../dist/styles.css', import.meta.url));
await cp(new URL('../src/shop.css', import.meta.url), new URL('../dist/shop.css', import.meta.url));
await cp(new URL('../public/', import.meta.url), new URL('../dist/', import.meta.url), { recursive: true });
console.log(`Built ${root}dist (${families.length} families, ${families.reduce((n, f) => n + f.products.length, 0)} flavours).`);
