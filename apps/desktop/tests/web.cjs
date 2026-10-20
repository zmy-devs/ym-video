const assert = require('node:assert/strict');
const { mkdtempSync } = require('node:fs');
const { createServer } = require('node:http');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { gzipSync } = require('node:zlib');
const { app, BrowserWindow, session } = require('electron');
const { register } = require('tsx/cjs/api');

register();

const { registerWebProtocol } = require('../src/main/utils/web-protocol.ts');

// 每轮使用独立的 Electron 数据目录，不访问真实账号、Cookie 或观看历史。
const userData = mkdtempSync(join(tmpdir(), 'ym-video-desktop-test-'));

app.setPath('userData', userData);

// 模拟线上 API，页面和静态资源一旦访问服务器就返回失败。
const requests = [];
const server = createServer(async (request, response) => {
  // 记录实际网络请求，确认协议转发保留方法、请求体和 Cookie。
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  // 仅包含本轮测试的虚构数据。
  const record = {
    path: request.url,
    method: request.method,
    cookie: request.headers.cookie ?? '',
    body: Buffer.concat(chunks).toString(),
  };

  requests.push(record);
  response.setHeader('content-type', 'application/json');

  if (request.url === '/outside-redirect') {
    response.setHeader('access-control-allow-origin', '*');
    response.writeHead(302, { location: '/media/playlist.m3u8' }).end();
    return;
  }

  if (request.url === '/media/playlist.m3u8') {
    response.setHeader('access-control-allow-origin', '*');
    response.setHeader('content-type', 'application/vnd.apple.mpegurl');
    response.end('#EXTM3U\nsegment.ts');
    return;
  }

  if (request.url === '/api/compressed') {
    // Chromium 会先解压响应，协议层不能再透传旧的编码与压缩长度。
    const compressed = gzipSync(JSON.stringify({ compressed: true }));

    response.setHeader('content-encoding', 'gzip');
    response.setHeader('content-length', compressed.length);
    response.end(compressed);
    return;
  }

  if (request.url === '/media/sample') {
    assert.equal(request.headers.range, 'bytes=1-3');
    response.setHeader('content-type', 'application/octet-stream');
    response.setHeader('content-range', 'bytes 1-3/6');
    response.setHeader('content-length', '3');
    response.writeHead(206).end('bcd');
    return;
  }

  if (request.url === '/api/auth/get-session') {
    response.end('null');
    return;
  }

  if (request.url === '/api/session') {
    response.setHeader(
      'set-cookie',
      'desktop-test=session; HttpOnly; SameSite=Lax; Path=/',
    );
  }

  if (request.url.startsWith('/api') || request.url === '/outside') {
    response.end(JSON.stringify(record));
    return;
  }

  response.writeHead(503).end('远程页面不可用');
});

// 等待真实 Vue 首屏渲染，超时立即报告失败。
const waitForLogin = async (window) => {
  // 会话请求最多等待 3 秒，额外预留资源读取和渲染时间。
  const deadline = Date.now() + 8_000;

  while (Date.now() < deadline) {
    if (
      await window.webContents.executeJavaScript(
        "document.querySelector('#login-heading')?.textContent === '欢迎回来'",
      )
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error('本地 Web 未能显示登录界面');
};

// 覆盖本地资源、SPA 刷新、接口转发、会话 Cookie 和断网首屏。
const run = async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  // 使用本机模拟来源，所有网络请求都留在测试服务器。
  const origin = new URL(`http://127.0.0.1:${server.address().port}`);

  registerWebProtocol(origin, join(__dirname, '../out/renderer'));

  // 隐藏测试窗口，使用与实际应用一致的浏览器隔离设置。
  const window = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  await window.loadURL(`${origin.origin}/history?test=refresh`);
  await waitForLogin(window);

  assert.equal(
    await window.webContents.executeJavaScript(
      "new URLSearchParams(location.search).get('redirect')",
    ),
    '/history?test=refresh',
  );
  assert.equal(
    await window.webContents.executeJavaScript(
      'document.styleSheets.length > 0 && [...document.images].some((image) => image.naturalWidth > 0)',
    ),
    true,
  );
  console.log('通过：SPA 深层地址直接打开，本地 JS、CSS 和图片正常加载');

  // POST 请求必须到达网络，响应中的 HttpOnly Cookie 必须继续生效。
  const payload = JSON.stringify({ test: 'desktop', value: '本地页面' });
  const post = await window.webContents.executeJavaScript(`
    fetch('/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: ${JSON.stringify(payload)},
      credentials: 'include',
    }).then((response) => response.json())
  `);

  assert.equal(post.method, 'POST');
  assert.equal(post.body, payload);

  // 下一次业务请求复用同源会话，渲染进程不能直接读取 HttpOnly Cookie。
  const echo = await window.webContents.executeJavaScript(
    "fetch('/api/echo', { credentials: 'include' }).then((response) => response.json())",
  );

  assert.match(echo.cookie, /desktop-test=session/u);
  assert.equal(
    await window.webContents.executeJavaScript('document.cookie'),
    '',
  );
  console.log('通过：API 的 POST 请求体和 HttpOnly 会话 Cookie 正常转发');

  // 其他来源同样走网络，不能被本地 SPA 覆盖。
  const outside = await session.defaultSession.fetch(
    `http://localhost:${server.address().port}/outside`,
  );

  assert.equal((await outside.json()).path, '/outside');
  console.log('通过：其他来源请求仍走网络');

  // 播放器依赖重定向后的真实地址解析子清单、密钥和分片。
  const mediaUrl = `http://localhost:${server.address().port}/outside-redirect`;
  const redirectedUrl = await window.webContents.executeJavaScript(`
    new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('GET', ${JSON.stringify(mediaUrl)});
      request.onload = () => resolve(request.responseURL);
      request.onerror = () => reject(new Error('媒体请求失败'));
      request.send();
    })
  `);

  assert.equal(new URL(redirectedUrl).pathname, '/media/playlist.m3u8');
  console.log('通过：媒体重定向保留真实响应地址');

  assert.equal(
    await window.webContents.executeJavaScript(
      "fetch('/api/compressed').then((response) => response.json()).then((body) => body.compressed)",
    ),
    true,
  );

  // 保留媒体分段请求的状态、Range 请求头和响应体。
  const range = await session.defaultSession.fetch(
    `http://localhost:${server.address().port}/media/sample`,
    { headers: { range: 'bytes=1-3' } },
  );

  assert.equal(range.status, 206);
  assert.equal(range.headers.get('content-range'), 'bytes 1-3/6');
  assert.equal(await range.text(), 'bcd');
  console.log('通过：压缩接口响应与媒体 Range 分段请求保持正常');

  // 资源缺失和非法路径不能回退成成功的 HTML，也不能读取包外文件。
  const checks = [
    ['/assets/missing.js', 404],
    ['/%E0%A4%A', 400],
    ['/..%5cpackage.json', 403],
  ];

  for (const [path, status] of checks) {
    // 通过实际 Chromium 请求验证解码后的路径边界。
    const response = await session.defaultSession.fetch(
      `${origin.origin}${path}`,
    );

    assert.equal(response.status, status, path);
  }

  // HEAD 保留内容类型但不返回响应体。
  const head = await session.defaultSession.fetch(
    `${origin.origin}/index.html`,
    {
      method: 'HEAD',
    },
  );

  assert.equal(head.status, 200);
  assert.match(head.headers.get('content-type'), /text\/html/u);
  assert.equal(await head.text(), '');
  console.log('通过：缺失资源、非法路径和 HEAD 响应符合预期');

  await window.webContents.executeJavaScript(
    "localStorage.setItem('desktop-test', 'preserved')",
  );

  // 清除网络缓存后关闭服务器，并让 Chromium 模拟完全离线。
  await session.defaultSession.clearCache();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  session.defaultSession.enableNetworkEmulation({ offline: true });

  await window.loadURL(`${origin.origin}/player/local/1?test=offline`);
  await waitForLogin(window);

  assert.equal(
    await window.webContents.executeJavaScript(
      "new URLSearchParams(location.search).get('redirect')",
    ),
    '/player/local/1?test=offline',
  );
  assert.equal(
    await window.webContents.executeJavaScript(
      "localStorage.getItem('desktop-test')",
    ),
    'preserved',
  );
  assert.equal(
    requests.some(
      (request) =>
        !request.path.startsWith('/api') &&
        ![
          '/outside',
          '/outside-redirect',
          '/media/playlist.m3u8',
          '/media/sample',
        ].includes(request.path),
    ),
    false,
  );
  console.log('通过：清缓存并完全断网后，仍能从本地打开页面和登录入口');

  // HTTPS 使用与生产相同的协议，显式阻止测试接口访问外网。
  const secureOrigin = new URL('https://desktop.ym-video.test');

  session.defaultSession.webRequest.onBeforeRequest(
    { urls: [`${secureOrigin.origin}/api/*`] },
    (_details, callback) => callback({ cancel: true }),
  );
  registerWebProtocol(secureOrigin, join(__dirname, '../out/renderer'));

  await window.loadURL(`${secureOrigin.origin}/history?test=https`);
  await waitForLogin(window);

  assert.equal(
    new URL(window.webContents.getURL()).origin,
    secureOrigin.origin,
  );
  console.log('通过：HTTPS 来源同样从本地打开，API 不可用时仍显示登录入口');

  window.destroy();
};

// 总超时防止协议递归或接口挂起导致测试进程无法退出。
const timeout = setTimeout(() => {
  console.error('桌面 Web 回归测试超时');
  app.exit(1);
}, 30_000);

app
  .whenReady()
  .then(run)
  .then(
    () => {
      clearTimeout(timeout);
      console.log('桌面 Web 回归全部通过');
      app.exit(0);
    },
    (error) => {
      clearTimeout(timeout);
      console.error(error);
      app.exit(1);
    },
  );
