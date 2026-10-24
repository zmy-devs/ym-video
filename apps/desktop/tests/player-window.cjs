const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync } = require('node:fs');
const { createServer } = require('node:http');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const electron = require('electron');
const ts = require('typescript');

// 使用独立数据目录，真实窗口只访问本机测试页面。
const { app, BrowserWindow } = electron;
app.setPath('userData', mkdtempSync(join(tmpdir(), 'ym-video-window-test-')));

// 页面链接与正式卡片一致，使用 target 和 noopener 打开播放器。
const server = createServer((_request, response) => {
  response.setHeader('content-type', 'text/html; charset=utf-8');
  response.setHeader(
    'set-cookie',
    'window-test=shared; HttpOnly; SameSite=Lax',
  );
  response.end(`<!doctype html><html><body>
    <div id="list" style="height:200px;overflow:auto"><div style="height:2000px">影片列表</div></div>
    <a id="play" href="/player/source/movie" target="_blank" rel="noopener">播放</a>
    <a id="other" href="/player/source/other?restart=1" target="_blank" rel="noopener">重新播放</a>
  </body></html>`);
});

// 保留真实 Electron 创建、导航与关闭行为，测试窗口不显示在桌面上。
class HiddenWindow {
  constructor(options) {
    // 返回原生 BrowserWindow，避免 Electron 的窗口枚举过滤子类。
    const window = new BrowserWindow({ ...options, show: false });
    window.show = () => {};
    window.focus = () => {};

    return window;
  }
}

// 等待原生窗口事件或页面完成加载，超时给出明确错误。
const until = async (check) => {
  const deadline = Date.now() + 8_000;

  while (!check()) {
    if (Date.now() > deadline) {
      throw new Error('等待播放窗口超时');
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

// 运行真实主进程窗口模块，仅替换初始来源并隐藏测试窗口。
const run = async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const origin = new URL(`http://127.0.0.1:${server.address().port}`);
  const source = readFileSync(
    join(__dirname, '../src/main/browser-windows/main.ts'),
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};

  runInNewContext(compiled, {
    exports,
    __dirname: join(__dirname, '../out/main'),
    URL,
    console,
    process,
    require: (name) => {
      if (name === 'electron') {
        return { ...electron, BrowserWindow: HiddenWindow };
      }

      if (name === '@electron-toolkit/utils') {
        return { is: { dev: false } };
      }

      if (name === '../utils/web') {
        return { webUrl: origin };
      }

      return require(name);
    },
  });

  const main = exports.createMainWindow();
  await until(() => !main.webContents.isLoadingMainFrame());
  await main.webContents.executeJavaScript(
    `
    document.querySelector('#list').scrollTop = 120;
    window.listState = 'preserved';
    localStorage.setItem('window-test', 'shared');
    document.querySelector('#play').click();
  `,
    true,
  );

  await until(() => BrowserWindow.getAllWindows().length === 2);
  const player = BrowserWindow.getAllWindows().find(
    (window) => window !== main,
  );
  await until(() => !player.webContents.isLoadingMainFrame());

  assert.equal(
    new URL(player.webContents.getURL()).pathname,
    '/player/source/movie',
  );
  assert.equal(main.webContents.getURL(), origin.href);
  assert.equal(
    await main.webContents.executeJavaScript('window.listState'),
    'preserved',
  );
  assert.equal(
    await main.webContents.executeJavaScript(
      "document.querySelector('#list').scrollTop",
    ),
    120,
  );
  assert.equal(player.webContents.session, main.webContents.session);
  assert.equal(
    await player.webContents.executeJavaScript(
      "localStorage.getItem('window-test')",
    ),
    'shared',
  );
  assert.equal(
    await player.webContents.executeJavaScript('typeof window.ipc'),
    'object',
  );
  assert.equal(
    (await player.webContents.session.cookies.get({ url: origin.href }))[0]
      ?.value,
    'shared',
  );
  console.log(
    '通过：真实新窗口打开播放页，主列表及滚动位置保留，IPC、会话和存储共享',
  );

  await player.webContents.executeJavaScript(
    "window.playbackState = 'preserved'",
  );
  await main.webContents.executeJavaScript(
    "document.querySelector('#play').click()",
    true,
  );
  assert.equal(BrowserWindow.getAllWindows().length, 2);
  assert.equal(
    await player.webContents.executeJavaScript('window.playbackState'),
    'preserved',
  );

  await main.webContents.executeJavaScript(
    "document.querySelector('#other').click()",
    true,
  );
  await until(
    () =>
      new URL(player.webContents.getURL()).pathname ===
        '/player/source/other' && !player.webContents.isLoadingMainFrame(),
  );
  assert.equal(BrowserWindow.getAllWindows().length, 2);
  assert.equal(
    new URL(player.webContents.getURL()).searchParams.get('restart'),
    '1',
  );
  console.log('通过：重复点击不重载相同影片，切换影片和从头播放复用同一窗口');

  await player.webContents.executeJavaScript(
    "setTimeout(() => history.pushState({}, '', '/overview'), 0)",
  );
  await until(() => player.isDestroyed());
  assert.equal(BrowserWindow.getAllWindows().length, 1);
  assert.equal(
    await main.webContents.executeJavaScript('window.listState'),
    'preserved',
  );
  console.log('通过：播放器返回主页时关闭，原主窗口及列表状态保留');

  main.destroy();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
};

// 原生加载失败时也必须退出，避免测试进程长期挂起。
const timeout = setTimeout(() => {
  console.error('播放窗口测试超时');
  app.exit(1);
}, 30_000);

app
  .whenReady()
  .then(run)
  .then(
    () => {
      clearTimeout(timeout);
      app.exit(0);
    },
    (error) => {
      clearTimeout(timeout);
      console.error(error);
      app.exit(1);
    },
  );
