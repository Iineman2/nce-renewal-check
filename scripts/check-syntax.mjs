import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const entries = await readdir(new URL('../scope-fit/', import.meta.url), { recursive: true });
const files = entries.filter(name => /\.(?:js|mjs)$/.test(name)).sort();
let failures = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', `scope-fit/${file}`], {
    cwd: root, encoding: 'utf8',
  });
  if (result.status !== 0) {
    failures++;
    process.stderr.write(`${file}: ${result.error?.message ?? result.stderr ?? 'check failed'}\n`);
  }
}
console.log(`${files.length - failures}/${files.length} JavaScript/module syntax checks passed.`);
process.exitCode = failures ? 1 : 0;
