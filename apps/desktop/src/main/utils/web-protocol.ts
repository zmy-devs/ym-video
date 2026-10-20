import { net, protocol } from 'electron';
import { stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';

// 保留重复响应头，并移除 Chromium 已经处理过的传输编码。
const createResponseHeaders = (values: Record<string, string | string[]>) => {
  // 重定向与普通响应共用相同的响应头转换。
  const headers = new Headers();

  for (const [name, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      headers.append(name, item);
    }
  }

  if (headers.has('content-encoding')) {
    headers.delete('content-encoding');
    headers.delete('content-length');
  }

  headers.delete('transfer-encoding');

  return headers;
};

// 使用原网络栈转发接口与媒体，并把重定向交还渲染进程处理。
const requestNetwork = async (request: Request) => {
  // 业务请求体较小，读取完成后再发起网络请求，避免丢失 POST 数据。
  const body = request.body
    ? Buffer.from(await request.arrayBuffer())
    : undefined;

  return new Promise<Response>((resolve, reject) => {
    // 同源 GET 通常没有 Origin 头，仍需沿用原站点的 Cookie。
    const origin = request.headers.get('origin') ?? undefined;
    const client = net.request({
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers),
      bypassCustomProtocolHandlers: true,
      redirect: 'manual',
      origin,
      credentials:
        request.credentials === 'same-origin' && !origin
          ? 'include'
          : request.credentials,
      referrerPolicy: request.referrerPolicy,
      cache: request.cache,
    });

    client.on('error', reject);
    client.on('redirect', (status, _method, destination, values) => {
      // 返回原始重定向，确保 HLS 的 responseURL 指向最终清单地址。
      const headers = createResponseHeaders(values);

      headers.set('location', destination);
      resolve(new Response(null, { status, headers }));
      client.abort();
    });
    client.on('response', (response) => {
      // HEAD、204、205 和 304 不能携带响应体。
      const hasBody =
        request.method !== 'HEAD' &&
        ![204, 205, 304].includes(response.statusCode);
      // Electron 响应实际为 Node Readable，类型声明缺少流接口。
      const responseBody = hasBody
        ? (Readable.toWeb(
            response as typeof response & Readable,
          ) as ReadableStream<Uint8Array>)
        : null;

      resolve(
        new Response(responseBody, {
          status: response.statusCode,
          headers: createResponseHeaders(response.headers),
        }),
      );
    });
    client.end(body);
  });
};

// 在原有站点来源下提供本地页面，保留 Cookie、IndexedDB 和接口的同源行为。
export const registerWebProtocol = (webUrl: URL, webRoot: string) => {
  // 所有本地资源必须位于随应用打包的 Web 目录内。
  const root = resolve(webRoot);

  protocol.handle(webUrl.protocol.slice(0, -1), async (request) => {
    // 仅接管应用站点的静态资源，接口和其他站点仍通过原网络栈请求。
    const url = new URL(request.url);

    if (
      url.origin !== webUrl.origin ||
      url.pathname === '/api' ||
      url.pathname.startsWith('/api/')
    ) {
      return requestNetwork(request);
    }

    // 解码后再检查路径，阻止编码斜杠、反斜杠等路径越界。
    let pathname: string;

    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response(null, { status: 400 });
    }

    // URL 路径只能解析为 Web 根目录内的文件。
    const filePath = resolve(root, `.${pathname}`);
    const relativePath = relative(root, filePath);

    if (
      pathname.includes('\0') ||
      relativePath === '..' ||
      relativePath.startsWith(`..${sep}`) ||
      isAbsolute(relativePath)
    ) {
      return new Response(null, { status: 403 });
    }

    // 缺失资源返回 404，只有页面导航才回退到 SPA 入口。
    const isFile = (await stat(filePath).catch(() => null))?.isFile();
    const isNavigation = request.headers.get('accept')?.includes('text/html');

    if (!isFile && !isNavigation) {
      return new Response(null, { status: 404 });
    }

    // 文件请求读取对应资源，页面导航使用应用入口。
    const localPath = isFile ? filePath : resolve(root, 'index.html');

    // 使用 Chromium 读取本地文件，保留 JS、CSS 等资源的正确 MIME 类型。
    const response = await net.fetch(pathToFileURL(localPath).href);

    if (request.method === 'HEAD') {
      return new Response(null, {
        status: response.status,
        headers: response.headers,
      });
    }

    return response;
  });
};
