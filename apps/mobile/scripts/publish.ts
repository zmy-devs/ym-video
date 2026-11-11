import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Publish Android from the mobile artifact directory to the shared repository release.
const directory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const desktop = join(directory, '../desktop');
const tsx = join(desktop, 'node_modules/tsx/dist/cli.mjs');
const result = spawnSync(
  process.execPath,
  [tsx, join(desktop, 'scripts/publish.ts'), 'android'],
  { cwd: desktop, stdio: 'inherit', env: process.env },
);

if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  throw new Error(`Android Release 发布失败，退出码 ${result.status}`);
}
