const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { runInNewContext } = require('node:vm');
const electron = require('electron');
const ts = require('typescript');

// 使用独立数据目录，真实窗口只访问本机测试页面。
const { app, BrowserWindow } = electron;
app.setPath('userData', mkdtempSync(join(tmpdir(), 'ym-video-window-test-')));
// 清理窗口后仍需等待 Vite 关闭，再由测试结果决定退出码。
app.on('window-all-closed', () => {});

// 沿用 Web 端现有浏览器回归页面，接口和 IPC 均由测试页在内存模拟。
const webRoot = join(__dirname, '../../web');

// 从实际使用 Vite 的 Web 工作区解析依赖。
const requireWeb = createRequire(join(webRoot, 'package.json'));

// 保留真实窗口和路由行为，测试页自行注入 IPC，避免连接更新或远程服务。
class HiddenWindow {
  constructor(options) {
    // 测试页注入可替换桥接，不加载生产预加载脚本。
    const window = new BrowserWindow({
      ...options,
      show: false,
      webPreferences: {
        ...options.webPreferences,
        preload: undefined,
        backgroundThrottling: false,
      },
    });
    window.show = () => {};
    window.focus = () => {};

    return window;
  }
}

// 等待会话超时、重试和真实组件更新，失败直接停止。
const until = async (check) => {
  // 会话回归包含五次真实超时和后续重试。
  const deadline = Date.now() + 60_000;

  while (!(await check())) {
    if (Date.now() > deadline) {
      throw new Error('等待播放与会话回归测试超时');
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

// 运行真实主窗口及 Web 组件，检查播放全过程只保留一个窗口。
const run = async () => {
  // 直接启动现有 Vite 配置，无需额外常驻开发服务。
  const { createServer } = await import(
    pathToFileURL(requireWeb.resolve('vite')).href
  );

  // 使用临时端口，避免占用现有开发服务。
  const server = await createServer({
    root: webRoot,
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: true,
      hmr: false,
      watch: null,
    },
  });

  try {
    await server.listen();

    // 测试页与桌面模块共享实际监听来源。
    const address = server.httpServer.address();

    // Electron 的同源判断使用本次本地服务。
    const origin = new URL(`http://127.0.0.1:${address.port}`);

    // 读取真实窗口实现，仅替换来源、显示和预加载边界。
    const source = readFileSync(
      join(__dirname, '../src/main/browser-windows/main.ts'),
      'utf8',
    );

    // 将 TypeScript 窗口实现放进可替换 Electron 边界的上下文。
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;

    // 获取实际的主窗口创建入口。
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
          return {
            webUrl: new URL('tests/browser/auth-navigation.html', origin),
          };
        }

        return require(name);
      },
    });

    // 两组真实组件测试复用同一个主窗口。
    const window = exports.createMainWindow();
    await until(() => !window.webContents.isLoadingMainFrame());

    for (const page of ['auth-navigation', 'playback-cache']) {
      if (page !== 'auth-navigation') {
        await window.loadURL(
          new URL(`tests/browser/${page}.html`, origin).href,
        );
      }
      await window.webContents.executeJavaScript(
        "document.querySelector('#run').click()",
        true,
      );
      await until(() =>
        window.webContents.executeJavaScript(
          "/^(全部通过|失败)/.test(document.querySelector('#status')?.textContent ?? '')",
        ),
      );

      // 读取页面报告，确保业务断言失败会让命令返回非零状态。
      const status = await window.webContents.executeJavaScript(
        "document.querySelector('#status')?.textContent",
      );
      assert.match(
        status,
        /^全部通过/,
        await window.webContents.executeJavaScript(
          "document.querySelector('#results')?.textContent || '尚未通过首个场景'",
        ),
      );
      assert.equal(BrowserWindow.getAllWindows().length, 1);
      console.log(`通过：${page} ${status}，全过程仅使用一个窗口`);
    }

    window.destroy();
  } finally {
    BrowserWindow.getAllWindows().forEach((window) => window.destroy());
    await server.close();
  }
};

// 原生加载失败时也必须退出，避免测试进程长期挂起。
const timeout = setTimeout(() => {
  console.error('播放与会话回归测试超时');
  app.exit(1);
}, 120_000);

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
