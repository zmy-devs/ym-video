import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

// 管理界面独立构建，通过同域 /admin/ 入口访问。
export default defineConfig({
  base: '/admin/',
  plugins: [vue(), tailwindcss()],
  publicDir: fileURLToPath(new URL('../../assets', import.meta.url)),
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 3001,
    strictPort: true,
    proxy: { '/api': 'http://localhost:8787' },
  },
  preview: { proxy: { '/api': 'http://localhost:8787' } },
});
