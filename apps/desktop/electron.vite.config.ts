import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import ElementPlus from "unplugin-element-plus/vite";
import AutoImport from "unplugin-auto-import/vite";
import { version, productName } from './package.json';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        "@": resolve("src/main"),
        "@type": resolve("src/type/index"),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          manager: resolve(__dirname, "src/preload/manager.ts"),
          player: resolve(__dirname, "src/preload/player.ts"),
        },
      },
    },
  },
  renderer: {
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __APP_NAME__: JSON.stringify(productName),
    },
    resolve: {
      alias: {
        "@": resolve("src/renderer/src"),
        "@type": resolve("src/type/index"),
        "@manager": resolve("src/renderer/src/browser-windows/manager"),
        "@player": resolve("src/renderer/src/browser-windows/player"),
      },
    },
    plugins: [
      vue(),
      ElementPlus({}),
      AutoImport({
        imports: ["vue", "pinia", "vue-router"],
        dts: true,
      }),
    ],
  },
});
