import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

// 浏览器端独立构建，开发与预览均通过同源路径访问 API。
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  publicDir: fileURLToPath(new URL('../../assets', import.meta.url)),
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8787',
      '/admin': { target: 'http://localhost:3001', ws: true },
    },
  },
  preview: {
    proxy: {
      '/api': 'http://localhost:8787',
      '/admin': 'http://localhost:4174',
    },
  },
});
