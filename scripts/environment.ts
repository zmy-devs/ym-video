import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 构建与发布共用仓库根目录的本地配置。
export const loadEnvironment = () => {
  const path = join(dirname(fileURLToPath(import.meta.url)), '../.env');
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
};
