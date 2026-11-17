import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

for (const name of await readdir(new URL('../src/js/', import.meta.url))) {
  if (!name.endsWith('.js')) continue;
  const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(`../src/js/${name}`, import.meta.url))], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('All JavaScript modules passed syntax checks.');
