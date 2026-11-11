import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// 仅将 Admin 管理端产物组合到 Worker 静态资源目录。
const directory = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(directory, '.assets');

// 保留静态资源根目录，开发服务监听期间仅重建 Admin 产物。
await mkdir(output, { recursive: true });
await rm(resolve(output, 'admin'), { recursive: true, force: true });
await cp(resolve(directory, '../admin/dist'), resolve(output, 'admin'), {
  recursive: true,
});
