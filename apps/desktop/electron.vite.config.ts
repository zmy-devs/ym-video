import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import {
  createIpcChannelsPlugin,
  type IpcChannelsPluginOptions,
} from 'plugin-electron-ipc/vite';

const ipcOptions = {
  input: ['src/main/ipc/index.ts', 'src/main/ipc/update.ipc.ts'],
  dts: 'src/preload/plugin-electron-ipc.d.ts',
} satisfies IpcChannelsPluginOptions;

export default defineConfig({
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
  renderer: {
    root: resolve('src/renderer'),
    server: {
      host: 'localhost',
      port: 5174,
      strictPort: true,
    },
  },
});
