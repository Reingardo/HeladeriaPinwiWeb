import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const remote = git(['remote', 'get-url', 'origin']);
if (remote !== 'https://github.com/Reingardo/HeladeriaPinwiWeb.git') {
  throw new Error('Unexpected publication repository.');
}
const commit = git(['rev-parse', 'HEAD']);
const target = await mkdtemp(join(tmpdir(), 'pinwi-pages-'));
const existing = git(['ls-remote', '--heads', 'origin', 'gh-pages']);
if (existing) {
  git(['clone', '--single-branch', '--branch', 'gh-pages', '--no-checkout', remote, target]);
} else {
  git(['init', '--initial-branch=gh-pages', target]);
  git(['remote', 'add', 'origin', remote], target);
}
git(['config', 'user.name', git(['config', 'user.name'])], target);
git(['config', 'user.email', git(['config', 'user.email'])], target);
await cp(new URL('../dist/', import.meta.url), target, { recursive: true });
await writeFile(join(target, '.nojekyll'), '');
await writeFile(join(target, 'deployment.json'), JSON.stringify({ sourceCommit: commit, sourceBranch: 'main' }) + '\n');
git(['add', '--all'], target);
if (git(['status', '--porcelain'], target)) {
  git(['commit', '-m', `Deploy Pinwi ${commit.slice(0, 12)}`], target);
  git(['push', 'origin', 'HEAD:refs/heads/gh-pages'], target);
}
console.log(`GitHub Pages branch published from ${commit}.`);
