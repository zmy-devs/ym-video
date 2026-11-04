import { env } from 'cloudflare:workers';
import { handleAsNodeRequest } from 'cloudflare:node';
import { createApp } from './app';

// 路由在 isolate 初始化阶段编译；不在请求期间触发动态代码生成。
const app = createApp(env);
// 在 Workers 中该端口是内部路由标识，不对外启动 TCP 监听。
app.server.listen(8080);
const ready = new Promise<void>((resolve, reject) => {
  app.ready((error) => (error ? reject(error) : resolve()));
});

export default {
  async fetch(request: Request): Promise<Response> {
    // 管理界面的导航由自身入口响应，资源地址继续按原路径读取。
    const url = new URL(request.url);

    if (url.pathname === '/admin') {
      url.pathname = '/admin/';
      return Response.redirect(url.href, 308);
    }

    if (url.pathname.startsWith('/admin/')) {
      if (
        ['GET', 'HEAD'].includes(request.method) &&
        request.headers.get('accept')?.includes('text/html') &&
        !/\.[^/]+$/.test(url.pathname)
      ) {
        url.pathname = '/admin/';
      }
      return env.ASSETS.fetch(new Request(url, request));
    }

    await ready;
    return handleAsNodeRequest(8080, request);
  },
} satisfies ExportedHandler<Env>;
