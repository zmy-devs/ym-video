import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import { loadConfigFromFile, mergeConfig } from 'vite';
import {
  createIpcChannelsPlugin,
  type IpcChannelsPluginOptions,
} from 'plugin-electron-ipc/vite';

// 主进程与预加载脚本共用 IPC 通道定义。
const ipcOptions = {
  input: [
    'src/main/ipc/index.ts',
    'src/main/ipc/update.ipc.ts',
    'src/main/ipc/resource.ipc.ts',
  ],
  dts: 'src/preload/plugin-electron-ipc.d.ts',
} satisfies IpcChannelsPluginOptions;

export default defineConfig(async (environment) => {
  // 通过 Vite 加载 Web 配置，复用 Vue、Tailwind、别名和开发代理。
  const web = await loadConfigFromFile(
    environment,
    resolve('../web/vite.config.ts'),
  );

  if (!web) {
    throw new Error('无法加载 Web 端 Vite 配置');
  }

  return {
    main: {
      resolve: {
        alias: {
          '@': resolve('src/main'),
        },
      },
      plugins: [createIpcChannelsPlugin(ipcOptions)],
    },
    preload: {
      plugins: [createIpcChannelsPlugin(ipcOptions)],
    },
    // 深度合并 Web 配置，沿用端口 3000，仅覆盖桌面构建路径。
    renderer: mergeConfig(web.config, {
      root: resolve('../web'),
      plugins: [
        {
          name: 'desktop-web-origin',
          // 在 electron-vite 的相对路径预设之后，保留站点根目录资源路径。
          config: () => ({ base: '/' }),
        },
      ],
      build: {
        outDir: resolve('out/renderer'),
        emptyOutDir: true,
        rollupOptions: { input: resolve('../web/index.html') },
      },
      server: { host: 'localhost' },
    }),
  };
});
