import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// 两份独立前端产物按访问路径组合到 Worker 的静态资源目录。
const directory = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(directory, '.assets');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(directory, '../web/dist'), output, { recursive: true });
await cp(resolve(directory, '../admin/dist'), resolve(output, 'admin'), {
  recursive: true,
});
