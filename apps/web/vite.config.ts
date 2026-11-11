import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

// 浏览器开发页在本机请求资源接口，账号 Cookie 不传给上游。
const resourceProxy = (): Plugin => ({
  name: 'ym-video-resource-proxy',
  configureServer(server) {
    server.middlewares.use(
      '/__ym_resource_proxy',
      async (request, response) => {
        const requestURL = new URL(request.url ?? '', 'http://localhost');
        const target = requestURL.searchParams.get('url');

        if (!target) {
          response.statusCode = 400;
          response.end('缺少资源接口地址');
          return;
        }

        let targetURL: URL;
        try {
          targetURL = new URL(target);
        } catch {
          response.statusCode = 400;
          response.end('资源接口地址无效');
          return;
        }

        if (
          !['http:', 'https:'].includes(targetURL.protocol) ||
          targetURL.username ||
          targetURL.password
        ) {
          response.statusCode = 400;
          response.end('资源接口地址无效');
          return;
        }

        try {
          const upstream = await fetch(targetURL, {
            headers: { accept: 'application/json' },
            redirect: 'manual',
            signal: AbortSignal.timeout(10_000),
          });

          if (upstream.status >= 300 && upstream.status < 400) {
            response.statusCode = 502;
            response.end('资源接口发生未经允许的重定向');
            return;
          }

          if (!upstream.ok) {
            response.statusCode = 502;
            response.end(`接口请求失败（${upstream.status}）`);
            return;
          }

          response.statusCode = 200;
          response.setHeader(
            'content-type',
            upstream.headers.get('content-type') ?? 'application/json',
          );
          response.end(Buffer.from(await upstream.arrayBuffer()));
        } catch {
          response.statusCode = 502;
          response.end('资源接口暂时不可用');
        }
      },
    );
  },
});

export default defineConfig(({ mode }) => {
  const isMobile = mode === 'mobile';
  const port = isMobile ? 3002 : 3000;

  return {
    plugins: [vue(), tailwindcss(), resourceProxy()],
    publicDir: fileURLToPath(new URL('../../assets', import.meta.url)),
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      host: isMobile ? '0.0.0.0' : process.env.TAURI_DEV_HOST || 'localhost',
      port,
      strictPort: true,
      proxy: {
        '/api': { target: 'http://127.0.0.1:8788', changeOrigin: true },
      },
    },
  };
});
