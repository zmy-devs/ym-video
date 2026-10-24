const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const { register } = require('tsx/cjs/api');

register();

// 按真实窗口模块的位置解析相邻 TypeScript 模块。
const requireMain = createRequire(
  join(__dirname, '../src/main/browser-windows/main.ts'),
);

// 运行真实窗口模块，替换 Electron 边界以检查链接流向。
const createWindow = (currentUrl, dev = true) => {
  // 分别记录窗口导航和系统浏览器调用。
  const external = [];

  // 每个模拟窗口独立记录导航、生命周期和唤起次数。
  const windows = [];

  class BrowserWindow {
    internal = [];
    events = new Map();
    contentEvents = new Map();
    url = '';
    destroyed = false;
    minimized = false;
    shown = 0;
    focused = 0;
    restored = 0;

    constructor(options) {
      this.options = options;
      windows.push(this);
    }

    webContents = {
      openDevTools() {},
      getURL: () => this.url,
      setWindowOpenHandler: (handler) => {
        this.handleOpen = handler;
      },
      on: (name, handler) => this.contentEvents.set(name, handler),
    };

    loadURL(url) {
      this.url = url;
      this.internal.push(url);
      return Promise.resolve();
    }

    on(name, handler) {
      this.events.set(name, handler);
    }

    isDestroyed() {
      return this.destroyed;
    }

    isMinimized() {
      return this.minimized;
    }

    restore() {
      this.minimized = false;
      this.restored += 1;
    }

    show() {
      this.shown += 1;
    }

    focus() {
      this.focused += 1;
    }

    close() {
      this.destroyed = true;
      this.events.get('closed')?.();
    }
  }

  // 将当前 TypeScript 源码编译为测试上下文中的 CommonJS 模块。
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
    __dirname,
    URL,
    console,
    process: { env: { ELECTRON_RENDERER_URL: currentUrl } },
    require: (name) => {
      if (name === 'electron') {
        return {
          BrowserWindow,
          shell: {
            openExternal: (url) => {
              external.push(url);
              return Promise.resolve();
            },
          },
        };
      }

      if (name === '@electron-toolkit/utils') {
        return { is: { dev } };
      }

      return requireMain(name);
    },
  });

  const main = exports.createMainWindow();
  const initial = [...main.internal];
  main.internal.length = 0;

  return {
    initial,
    internal: main.internal,
    external,
    main,
    windows,
    createMain: exports.createMainWindow,
    open: (url) => main.handleOpen({ url }),
  };
};

test('生产入口使用线上 HTTPS 来源加载内置页面', () => {
  const window = createWindow('file:///C:/app/index.html', false);

  assert.deepEqual(window.initial, [
    'https://ym-video.zhangmingyang.dpdns.org/',
  ]);
});

test('播放页在独立窗口打开，保留主窗口并使用相同的预加载和隔离配置', () => {
  for (const origin of ['http://localhost:5173', 'https://video.example']) {
    const window = createWindow(`${origin}/history`);
    const target = `${origin}/player/source/movie?restart=1`;

    assert.equal(window.open(target).action, 'deny');
    assert.deepEqual(window.internal, []);
    assert.deepEqual(window.external, []);
    assert.equal(window.windows.length, 2);
    const player = window.windows[1];
    assert.deepEqual(player.internal, [target]);
    assert.equal(player.options.webPreferences.contextIsolation, true);
    assert.equal(player.options.webPreferences.nodeIntegration, false);
    assert.equal(
      player.options.webPreferences.preload,
      window.main.options.webPreferences.preload,
    );
  }
});

test('相同影片只唤起播放器，其他影片及从头播放复用同一窗口', () => {
  const window = createWindow('http://localhost:5173/');
  const target = 'http://localhost:5173/player/source/movie';

  window.open(target);
  const player = window.windows[1];
  player.minimized = true;
  window.open(target);
  assert.equal(player.restored, 1);
  assert.equal(player.focused, 1);
  assert.deepEqual(player.internal, [target]);
  window.open(`${target}?restart=1`);
  window.open(`${target}?restart=1`);
  window.open('http://localhost:5173/player/source/other');
  assert.equal(window.windows.length, 2);
  assert.equal(player.internal.length, 4);
  assert.equal(
    player.internal.at(-1),
    'http://localhost:5173/player/source/other',
  );
});

test('播放器返回主页会关闭播放器并还原主窗口，关闭后可以重新打开', () => {
  const window = createWindow('http://localhost:5173/');
  window.open('http://localhost:5173/player/source/movie');
  const player = window.windows[1];
  window.main.minimized = true;

  player.contentEvents.get('did-navigate-in-page')(
    {},
    'http://localhost:5173/overview',
    true,
  );
  assert.equal(player.destroyed, true);
  assert.equal(window.main.restored, 1);
  assert.equal(window.main.focused, 1);
  assert.deepEqual(window.internal, []);
  window.open('http://localhost:5173/player/source/movie');
  assert.equal(window.windows.length, 3);
});

test('主窗口关闭后可以重建，已存在的主窗口只唤起不重复加载', () => {
  const window = createWindow('http://localhost:5173/');
  assert.equal(window.createMain(), window.main);
  assert.deepEqual(window.internal, []);
  window.main.close();
  assert.notEqual(window.createMain(), window.main);
  assert.equal(window.windows.length, 2);
});

test('外部网站交给浏览器，非允许协议不打开', () => {
  const window = createWindow('http://localhost:5173/');

  window.open('https://example.com/');
  window.open('javascript:alert(1)');
  window.open('file:///C:/outside.html');

  assert.deepEqual(window.internal, []);
  assert.deepEqual(window.external, ['https://example.com/']);
});
