import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { families, packages, ingredients } from '../src/js/catalog.js';

test('catalogue resources resolve on Vercel and project GitHub Pages', async () => {
  const paths = [...families.flatMap(family => [family.image, family.feature.image, ...family.products.map(item => item.image)]), ...packages.map(item => item.image), ...ingredients];
  for (const path of paths) {
    assert.ok(path.startsWith('./assets/'), `Non-portable resource: ${path}`);
    await access(new URL('../public/' + path, import.meta.url));
    assert.ok(new URL(path, 'https://reingardo.github.io/HeladeriaPinwiWeb/').pathname.startsWith('/HeladeriaPinwiWeb/assets/'));
    assert.ok(new URL(path, 'https://heladeriapinwiweb.vercel.app/').pathname.startsWith('/assets/'));
  }
});

test('HTML, styles and version switch do not escape the deployment subpath', async () => {
  const html = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /(?:href|src)="\/(?!\/)/);
  const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /url\(["']?\/(?!\/)/);
  const main = await readFile(new URL('../src/js/main.js', import.meta.url), 'utf8');
  assert.match(main, /versionLink\.href = '\.\/#menu'/);
});
