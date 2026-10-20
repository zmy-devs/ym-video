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
  const internal = [];
  const external = [];
  let handleOpen;

  class BrowserWindow {
    webContents = {
      openDevTools() {},
      getURL: () => currentUrl,
      setWindowOpenHandler: (handler) => {
        handleOpen = handler;
      },
    };

    loadURL(url) {
      internal.push(url);
      return Promise.resolve();
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

  exports.createMainWindow();
  const initial = [...internal];
  internal.length = 0;

  return { initial, internal, external, open: (url) => handleOpen({ url }) };
};

test('生产入口使用线上 HTTPS 来源加载内置页面', () => {
  const window = createWindow('file:///C:/app/index.html', false);

  assert.deepEqual(window.initial, [
    'https://ym-video.zhangmingyang.dpdns.org/',
  ]);
});

test('播放页及重新播放在桌面当前窗口打开', () => {
  for (const origin of ['http://localhost:5173', 'https://video.example']) {
    const window = createWindow(`${origin}/history`);
    const target = `${origin}/player/source/movie?restart=1`;

    assert.equal(window.open(target).action, 'deny');
    assert.deepEqual(window.internal, [target]);
    assert.deepEqual(window.external, []);
  }
});

test('外部网站交给浏览器，非允许协议不打开', () => {
  const window = createWindow('http://localhost:5173/');

  window.open('https://example.com/');
  window.open('javascript:alert(1)');
  window.open('file:///C:/outside.html');

  assert.deepEqual(window.internal, []);
  assert.deepEqual(window.external, ['https://example.com/']);
});
