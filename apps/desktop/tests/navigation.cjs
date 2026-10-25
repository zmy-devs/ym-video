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
      setWindowOpenHandler: (handler) => {
        this.handleOpen = handler;
      },
    };

    loadURL(url) {
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

test('播放页留在当前窗口，站内新窗口请求不会创建播放器窗口', () => {
  for (const origin of ['http://localhost:5173', 'https://video.example']) {
    const window = createWindow(`${origin}/history`);
    const target = `${origin}/player/source/movie?restart=1`;

    assert.equal(window.open(target).action, 'deny');
    assert.deepEqual(window.internal, [target]);
    assert.deepEqual(window.external, []);
    assert.equal(window.windows.length, 1);
    assert.equal(window.main.options.webPreferences.contextIsolation, true);
    assert.equal(window.main.options.webPreferences.nodeIntegration, false);
  }
});

test('切换影片和从头播放始终使用当前窗口', () => {
  const window = createWindow('http://localhost:5173/');
  const target = 'http://localhost:5173/player/source/movie';

  window.open(target);
  window.open(`${target}?restart=1`);
  window.open('http://localhost:5173/player/source/other');
  assert.equal(window.windows.length, 1);
  assert.equal(window.internal.length, 3);
  assert.equal(
    window.internal.at(-1),
    'http://localhost:5173/player/source/other',
  );
});

test('播放页返回主页仍使用当前窗口', () => {
  const window = createWindow('http://localhost:5173/');
  window.open('http://localhost:5173/player/source/movie');
  window.open('http://localhost:5173/overview');
  assert.equal(window.main.destroyed, false);
  assert.equal(window.windows.length, 1);
  assert.equal(window.createMain(), window.main);
  assert.equal(window.internal.at(-1), 'http://localhost:5173/overview');
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
