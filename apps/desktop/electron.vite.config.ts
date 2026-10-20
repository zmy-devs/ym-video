import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import { loadEnv } from 'vite';
import {
  createIpcChannelsPlugin,
  type IpcChannelsPluginOptions,
} from 'plugin-electron-ipc/vite';

const ipcOptions = {
  input: ['src/main/ipc/index.ts', 'src/main/ipc/update.ipc.ts'],
  dts: 'src/preload/plugin-electron-ipc.d.ts',
} satisfies IpcChannelsPluginOptions;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDevelopment = mode === 'development';
  const webUrl =
    env.YM_VIDEO_WEB_URL ||
    process.env.YM_VIDEO_WEB_URL ||
    (isDevelopment ? 'http://localhost:5173' : '');

  if (!webUrl) {
    throw new Error('生产构建必须配置 YM_VIDEO_WEB_URL');
  }

  const parsedWebUrl = new URL(webUrl);
  const isLocalDevelopmentUrl =
    isDevelopment &&
    parsedWebUrl.protocol === 'http:' &&
    ['localhost', '127.0.0.1'].includes(parsedWebUrl.hostname);

  if (parsedWebUrl.protocol !== 'https:' && !isLocalDevelopmentUrl) {
    throw new Error('YM_VIDEO_WEB_URL 必须使用 HTTPS');
  }

  return {
    main: {
      resolve: {
        alias: {
          '@': resolve('src/main'),
        },
      },
      define: {
        __YM_VIDEO_WEB_URL__: JSON.stringify(parsedWebUrl.toString()),
      },
      plugins: [createIpcChannelsPlugin(ipcOptions)],
    },
    preload: {
      plugins: [createIpcChannelsPlugin(ipcOptions)],
    },
    renderer: {
      root: resolve('src/renderer'),
    },
  };
});
