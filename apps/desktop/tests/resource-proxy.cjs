const assert = require('node:assert/strict');
const { mkdtempSync } = require('node:fs');
const { createServer } = require('node:http');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { register } = require('tsx/cjs/api');

register();

const { requestResource } = require('../src/main/ipc/resource.ipc.ts');

// 测试窗口使用独立存储，不读取用户的账号与历史。
app.setPath('userData', mkdtempSync(join(tmpdir(), 'ym-video-proxy-test-')));
ipcMain.handle('requestResource', requestResource);

// 本地 HTTP 服务代替外部资源源，不访问线上接口或 Cloudflare。
const server = createServer(async (request, response) => {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString('utf8');
  const url = new URL(request.url, 'http://127.0.0.1');

  if (url.pathname === '/') {
    response.setHeader('content-type', 'text/html');
    response.end('<!doctype html><title>IPC proxy test</title>');
    return;
  }

  if (url.pathname === '/redirect') {
    response.writeHead(302, { location: '/json' }).end();
    return;
  }

  if (url.pathname === '/invalid') {
    response.end('<html>bad upstream response</html>');
    return;
  }

  if (url.pathname === '/error') {
    response.writeHead(503).end('unavailable');
    return;
  }

  response.setHeader('content-type', 'application/json');
  response.end(
    JSON.stringify({
      method: request.method,
      query: Object.fromEntries(url.searchParams),
      cookie: request.headers.cookie ?? '',
      authorization: request.headers.authorization ?? '',
      body,
    }),
  );
});

// 校验单 IPC 地址代理、会话隔离及错误处理。
const run = async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  // 真实 preload、IPC 与 Node 网络请求组成完整的桌面链路。
  const origin = `http://127.0.0.1:${server.address().port}`;

  process.env.ELECTRON_RENDERER_URL = origin;

  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: join(__dirname, '../out/preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 所有测试调用都经过实际的 contextBridge 和 ipcRenderer.invoke。
  const invoke = (url) =>
    window.webContents.executeJavaScript(
      `window.ipc.requestResource(${JSON.stringify(url)})`,
    );

  try {
    await window.loadURL(origin);
    await window.webContents.session.cookies.set({
      url: origin,
      name: 'session',
      value: 'test-only',
    });

    const response = await invoke(
      `${origin}/json?token=test&ac=detail&wd=${encodeURIComponent('动画')}`,
    );

    assert.deepEqual(response.query, {
      token: 'test',
      ac: 'detail',
      wd: '动画',
    });
    assert.equal(response.method, 'GET');
    assert.equal(response.cookie, '');
    assert.equal(response.authorization, '');
    console.log('通过：单 IPC 传入完整 URL，由 Node fetch 直接请求');

    for (const [path, message] of [
      ['/redirect', '重定向'],
      ['/invalid', 'JSON'],
      ['/error', '503'],
    ]) {
      await assert.rejects(
        invoke(`${origin}${path}`),
        new RegExp(message, 'u'),
      );
    }

    await assert.rejects(invoke('file:///etc/passwd'), /HTTP 或 HTTPS/u);
    await window.loadURL('data:text/html,<title>Untrusted</title>');
    await assert.rejects(invoke(`${origin}/json`), /不允许/u);
    console.log('通过：拒绝重定向、无效 URL、HTTP 错误和未授权页面');
  } finally {
    window.destroy();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
};

app
  .whenReady()
  .then(run)
  .then(
    () => app.exit(0),
    (error) => {
      console.error(error);
      app.exit(1);
    },
  );
