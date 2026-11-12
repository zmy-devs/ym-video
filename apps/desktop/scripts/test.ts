import { loadEnvironment } from '../../../scripts/environment.js';
import desktopConfig from '../src-tauri/tauri.conf.json' with { type: 'json' };
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

loadEnvironment();

// 桌面应用的根目录。
const directory = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Rust 工具和 WebDriver 可执行文件的安装目录。
const cargoHome = process.env.CARGO_HOME || join(homedir(), '.cargo');

process.env.PATH = join(cargoHome, 'bin') + ';' + process.env.PATH;

// 工作区安装的 Tauri CLI 入口。
const cli = join(directory, 'node_modules/@tauri-apps/cli/tauri.js');

// 运行验证命令并核对退出状态。
const run = (command: string, args: string[], cwd = directory) => {
  // 当前命令返回的执行结果。
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  assert.equal(result.status, 0, command + ' ' + args.join(' '));
};

// 等待异步界面状态达到测试条件。
const until = async (
  check: () => unknown | Promise<unknown>,
  timeout = 60000,
) => {
  // 本轮异步场景允许等待的截止时间。
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (await check()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('等待 Windows 回归测试超时');
};

// 通过 HTTP 调用 WebDriver 协议。
const call = async <T = unknown>(
  port: number,
  path: string,
  body?: unknown,
  method = 'POST',
): Promise<T> => {
  // 本次网络请求返回的响应。
  const response = await fetch('http://localhost:' + port + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // WebDriver 按 W3C 协议返回的响应数据。
  const result = (await response.json()) as {
    value: T;
  };

  if (!response.ok) {
    throw new Error(JSON.stringify(result));
  }

  return result.value;
};

// 在测试窗口中执行浏览器脚本。
const execute = <T = unknown>(
  port: number,
  session: string,
  script: string,
  args: unknown[] = [],
) => call<T>(port, '/session/' + session + '/execute/sync', { script, args });

// 通过测试窗口调用 Tauri 原生能力。
const invoke = async <T = unknown>(
  session: string,
  command: string,
  args: Record<string, unknown>,
): Promise<T> => {
  // 当前命令返回的执行结果。
  const result = await call<{
    ok: boolean;
    value: T;
    error?: unknown;
  }>(4444, '/session/' + session + '/execute/async', {
    script: `
// WebDriver 异步执行结果的完成回调。
// WebDriver 等待的完成回调。
const done = arguments[arguments.length - 1];

window.__TAURI_INTERNALS__.invoke(arguments[0], arguments[1]).then(
  (value) => done({ ok: true, value }),
  (error) => done({ ok: false, error }),
);
`,
    args: [command, args],
  });

  if (!result.ok) {
    throw new Error(JSON.stringify(result.error));
  }

  return result.value;
};

// 原生 Rust 边界测试与独立测试标识的 WebView2 应用。
run('cargo', ['test', '--manifest-path', 'src-tauri/Cargo.toml', '--locked']);

// 本轮测试独立使用的临时目录。
const fixture = mkdtempSync(join(tmpdir(), 'ym-video-update-'));

// 本轮更新签名测试使用的临时私钥。
const testKey = join(fixture, 'test.key');

run(process.execPath, [
  cli,
  'signer',
  'generate',
  '-w',
  testKey,
  '-p',
  '',
  '--ci',
]);

// 本次操作读取的 Tauri 配置。
const config = structuredClone(desktopConfig);

// 使用独立标识与本地更新服务的测试配置。
const testConfig = {
  identifier: 'com.zmy-devs.ym-video-test',
  app: {
    windows: config.app.windows.map((window) => ({
      ...window,
      visible: true,
    })),
  },
  plugins: {
    updater: {
      pubkey: readFileSync(testKey + '.pub', 'utf8').trim(),
      endpoints: ['http://127.0.0.1:8788/latest.json'],
      dangerousInsecureTransportProtocol: true,
    },
  },
};

run(process.execPath, [
  cli,
  'build',
  '--debug',
  '--no-bundle',
  '--config',
  JSON.stringify(testConfig),
]);

// 与 WebView2 版本匹配的 Edge 驱动。
const driver = join(cargoHome, 'bin/msedgedriver.exe');

// 用于启动 Tauri 测试窗口的驱动。
const tauriDriver = join(cargoHome, 'bin/tauri-driver.exe');

assert(
  existsSync(driver),
  '请把匹配 WebView2 版本的 msedgedriver.exe 放入 CARGO_HOME/bin',
);

assert(existsSync(tauriDriver), '请运行 cargo install tauri-driver --locked');

// 从 Web 工作区解析测试服务的依赖。
const requireWeb = createRequire(join(directory, '../web/package.json'));

// Web 工作区提供的 Vite 服务创建函数。
const { createServer: createVite } = await import(
  pathToFileURL(requireWeb.resolve('vite')).href
);

// 用于承载浏览器回归页面的开发服务。
const vite = await createVite({
  root: resolve(directory, '../web'),
  server: { host: 'localhost', port: 5180, strictPort: true },
});

await vite.listen();

// 本轮签名测试使用的安装包样本。
const artifact = join(fixture, 'update.exe');

writeFileSync(artifact, 'MZ signed updater test payload');

run(process.execPath, [
  cli,
  'signer',
  'sign',
  '-f',
  testKey,
  '-p',
  '',
  '--app-version',
  '999.0.0',
  artifact,
]);

// 用于测试更新验证的产物签名。
const signature = readFileSync(artifact + '.sig', 'utf8').trim();

run('ffmpeg', [
  '-hide_banner',
  '-loglevel',
  'error',
  '-f',
  'lavfi',
  '-i',
  'testsrc=size=320x180:rate=24',
  '-f',
  'lavfi',
  '-i',
  'sine=frequency=440:sample_rate=44100',
  '-t',
  '12',
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-preset',
  'ultrafast',
  '-g',
  '48',
  '-c:a',
  'aac',
  '-hls_time',
  '2',
  '-hls_playlist_type',
  'vod',
  join(fixture, 'sample.m3u8'),
]);

// 本机播放器测试是否已经启用登录会话。
let playbackSession = false;

// 本地更新服务当前提供的测试场景。
let updateMode: 'none' | 'valid' | 'invalid' = 'none';

// 测试 HTTP 服务实际收到的请求记录。
const records: Array<{
  path: string;
  cookie: string;
  origin: string;
  body: string;
}> = [];

// API 和资源源共用测试 HTTP 服务，Cookie 只由业务客户端携带。
const server = createServer(async (request, response) => {
  // 当前操作对应的文件或请求路径。
  const path = request.url ?? '/';

  // 当前请求接收到的原始数据片段。
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  records.push({
    path: path,
    cookie: request.headers.cookie || '',
    origin: request.headers.origin || '',
    body: Buffer.concat(chunks).toString(),
  });

  response.setHeader('content-type', 'application/json');

  if (path === '/latest.json') {
    if (updateMode === 'none') {
      return response.writeHead(204).end();
    }

    return response.end(
      JSON.stringify({
        version: '999.0.0',
        platforms: {
          'windows-x86_64': {
            url: 'http://127.0.0.1:8788/update.exe',
            signature,
          },
        },
      }),
    );
  }

  if (path === '/update.exe') {
    return response.end(
      updateMode === 'invalid' ? 'tampered artifact' : readFileSync(artifact),
    );
  }

  if (path.startsWith('/api/auth/get-session')) {
    return response.end(
      JSON.stringify(
        playbackSession
          ? {
              user: {
                id: 'native-playback',
                role: 'user',
                name: '本机播放测试',
                email: 'native@example.com',
              },
              session: { id: 'native-session' },
            }
          : null,
      ),
    );
  }

  if (path.startsWith('/api/v1/history')) {
    return response.end(
      JSON.stringify({
        ownerId: 'native-playback',
        epoch: 'initial',
        revision: 0,
        records: [],
      }),
    );
  }

  if (path.startsWith('/catalog')) {
    // 用于验证来源和读取查询条件的请求地址。
    const url = new URL(path, 'http://127.0.0.1:8788');

    return response.end(
      JSON.stringify(
        url.searchParams.get('ac') === 'list'
          ? { class: [{ type_id: 1, type_name: '本机测试' }] }
          : {
              list: [
                {
                  vod_id: 'movie',
                  vod_name: '本机 HLS 测试',
                  vod_play_url:
                    '第一集$http://127.0.0.1:8788/media/sample.m3u8#第二集$http://127.0.0.1:8788/media/sample.m3u8?episode=2',
                },
              ],
              pagecount: 1,
            },
      ),
    );
  }

  if (path.startsWith('/media/')) {
    // 包含版本与平台信息的安装包名称。
    const filename = basename(new URL(path, 'http://127.0.0.1:8788').pathname);

    response.setHeader('access-control-allow-origin', '*');

    response.setHeader(
      'content-type',
      filename.endsWith('.m3u8')
        ? 'application/vnd.apple.mpegurl'
        : 'video/mp2t',
    );

    return response.end(readFileSync(join(fixture, filename)));
  }

  if (path === '/api/test/login') {
    response.setHeader(
      'set-cookie',
      'native-test=secret; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax',
    );
  }

  if (path === '/api/test/logout') {
    response.setHeader(
      'set-cookie',
      'native-test=; HttpOnly; Path=/; Max-Age=0',
    );
  }

  if (path === '/redirect') {
    return response.writeHead(302, { location: '/resource' }).end();
  }

  if (path === '/invalid-json') {
    return response.end('invalid-json');
  }

  if (path === '/slow') {
    return setTimeout(() => response.end('{}'), 11000);
  }

  response.end(
    JSON.stringify({ cookie: request.headers.cookie || '', ok: true }),
  );
});

await new Promise<void>((resolve) => server.listen(8788, '127.0.0.1', resolve));

// 承载浏览器回归页面的 Edge 驱动进程。
const edge = spawn(driver, ['--port=9515'], { stdio: 'ignore' });

// 承载原生窗口回归的 Tauri 驱动进程。
const native = spawn(
  tauriDriver,
  ['--port', '4444', '--native-port', '9516', '--native-driver', driver],
  { stdio: 'ignore' },
);

// 浏览器回归使用的 WebDriver 会话标识。
let browserSession = '';

// 原生窗口回归使用的 WebDriver 会话标识。
let nativeSession = '';

try {
  await until(async () => {
    try {
      await call(9515, '/status', undefined, 'GET');

      return true;
    } catch {
      return false;
    }
  });

  // 浏览器驱动创建的会话信息。
  const browser = await call<{
    sessionId: string;
  }>(9515, '/session', {
    capabilities: {
      alwaysMatch: {
        browserName: 'MicrosoftEdge',
        'ms:edgeOptions': {
          args: [
            '--headless=new',
            '--window-size=1280,800',
            '--autoplay-policy=no-user-gesture-required',
          ],
        },
      },
    },
  });

  browserSession = browser.sessionId;

  for (const name of process.env.YM_VIDEO_BROWSER_TESTS?.split(',').filter(
    Boolean,
  ) || [
    'desktop-update',
    'sources',
    'navigation',
    'settings',
    'history',
    'admin-navigation',
    'auth-navigation',
    'playback-cache',
    'playback-ui',
  ]) {
    await call(9515, '/session/' + browserSession + '/url', {
      url: 'http://localhost:5180/tests/browser/' + name + '.html',
    });

    await execute(
      9515,
      browserSession,
      `
// 测试页面的固定高度挂载区。
const fixture = document.querySelector('#fixture');
if (fixture) {
  fixture.style.height = '600px';
}
document.querySelector('#run')?.click();
`,
    );

    // 版本检查与下载的当前状态。
    let status = '';

    await until(async () => {
      status = await execute<string>(
        9515,
        browserSession,
        `
return document.querySelector('#status')?.textContent || '';
`,
      );

      if (/失败|Error|failed/i.test(status)) {
        throw new Error(name + ': ' + status);
      }

      return /通过/.test(status);
    }, 120000);

    console.log('浏览器回归通过 ' + name + ' ' + status);
  }

  await until(async () => {
    try {
      await call(4444, '/status', undefined, 'GET');

      return true;
    } catch {
      return false;
    }
  });

  // 启动独立测试应用并等待登录界面。
  const openNative = async () => {
    // 当前命令返回的执行结果。
    const result = await call<{
      sessionId: string;
    }>(4444, '/session', {
      capabilities: {
        alwaysMatch: {
          'tauri:options': {
            application: join(directory, 'src-tauri/target/debug/ym-video.exe'),
          },
        },
      },
    });

    nativeSession = result.sessionId;

    await call(4444, '/session/' + nativeSession + '/timeouts', {
      script: 30000,
    });

    await until(async () =>
      execute(
        4444,
        nativeSession,
        `
return !!document.querySelector('#login-heading');
`,
      ),
    );
  };

  await openNative();

  assert.equal(
    await execute(4444, nativeSession, 'return location.origin'),
    'http://tauri.localhost',
  );

  assert.equal(
    await execute(
      4444,
      nativeSession,
      `
return document.querySelectorAll('[data-action="close"]').length;
`,
    ),
    1,
  );

  // 调用本机模拟服务提供的业务 API。
  const api = (path: string, method = 'GET', body: string | null = null) =>
    invoke<{
      body: string;
      status: number;
    }>(nativeSession, 'request_api', {
      id: crypto.randomUUID(),
      request: { path, method, body, contentType: 'application/json' },
    });

  console.log('验证原生 API 会话');

  await api('/api/test/logout', 'POST');

  await api('/api/test/login', 'POST', '{"test":true}');

  assert.match((await api('/api/test/session')).body, /native-test=secret/);

  // 本地资源接口返回的 JSON 数据。
  const resource = await invoke<{
    cookie: string;
  }>(nativeSession, 'request_resource', {
    id: crypto.randomUUID(),
    url: 'http://127.0.0.1:8788/resource',
  });

  assert.equal(resource.cookie, '');

  for (const address of [
    'file:///private',
    'http://user:secret@127.0.0.1:8788/resource',
    'http://127.0.0.1:8788/redirect',
    'http://127.0.0.1:8788/invalid-json',
  ]) {
    await assert.rejects(
      invoke(nativeSession, 'request_resource', {
        id: crypto.randomUUID(),
        url: address,
      }),
    );
  }

  // 同一 WebView 任务中完成取消，避免驱动串行执行造成等待。
  const cancelled = await call<{ cancelled: boolean; message?: string }>(
    4444,
    '/session/' + nativeSession + '/execute/async',
    {
      script: `
// WebDriver 等待的异步完成回调。
const done = arguments[arguments.length - 1];

// 两条原生命令共用同一请求标识。
const id = crypto.randomUUID();

window.__TAURI_INTERNALS__
  .invoke('request_resource', {
    id,
    url: 'http://127.0.0.1:8788/slow',
  })
  .then(
    () => done({ cancelled: false }),
    (error) => done({ cancelled: true, message: error.message }),
  );

setTimeout(() => {
  window.__TAURI_INTERNALS__.invoke('cancel_request', { id }).catch((error) => {
    done({ cancelled: false, error });
  });
}, 200);
`,
      args: [],
    },
  );

  assert.equal(cancelled.cancelled, true);

  assert.match(cancelled.message ?? '', /请求已取消/);

  console.log('验证原生窗口与会话恢复');

  await invoke(nativeSession, 'plugin:window|minimize', { label: 'main' });

  // 相同应用的第二次启动应由既有窗口接收。
  const secondInstance = spawnSync(
    join(directory, 'src-tauri/target/debug/ym-video.exe'),
    [],
    {
      timeout: 10_000,
      stdio: 'ignore',
      env: process.env,
    },
  );

  assert.equal(secondInstance.status, 0);

  assert.equal(
    await invoke<boolean>(nativeSession, 'plugin:window|is_minimized', {
      label: 'main',
    }),
    false,
  );

  // 驱动读取到的原生窗口尺寸。
  const rect = await call<{
    width: number;
  }>(4444, '/session/' + nativeSession + '/window/rect', undefined, 'GET');

  assert(Math.abs(rect.width - 1280) <= 2, '窗口宽度应符合配置与系统边框尺寸');

  await execute(
    4444,
    nativeSession,
    `
document.querySelector('[data-action="maximize"]').click();
`,
  );

  await until(async () =>
    execute(
      4444,
      nativeSession,
      `
return !!document.querySelector('[data-action="restore"]');
`,
    ),
  );

  await call(4444, '/session/' + nativeSession, undefined, 'DELETE');

  nativeSession = '';

  await openNative();

  assert.match((await api('/api/test/session')).body, /native-test=secret/);

  await api('/api/test/logout', 'POST');

  assert.doesNotMatch(
    (await api('/api/test/session')).body,
    /native-test=secret/,
  );

  assert.equal(
    await invoke(nativeSession, 'plugin:updater|check', { headers: [] }),
    null,
  );

  console.log('验证原生更新签名');

  for (const mode of ['valid', 'invalid', 'valid'] as const) {
    updateMode = mode;

    // updater 持有的版本信息和已下载资源。
    const update = await invoke<{
      rid: number;
    }>(nativeSession, 'plugin:updater|check', { headers: [] });

    // 用于接收原生下载进度的回调标识。
    const callback = await execute(
      4444,
      nativeSession,
      `
return window.__TAURI_INTERNALS__.transformCallback(() => {});
`,
    );

    // 本轮更新下载的原生调用结果。
    const download = invoke(nativeSession, 'plugin:updater|download', {
      rid: update.rid,
      onEvent: '__CHANNEL__:' + callback,
      headers: [],
    });

    if (mode === 'invalid') {
      await assert.rejects(download);
    } else {
      assert.equal(typeof (await download), 'number');
    }
  }

  assert(
    records.some(
      (record) =>
        record.body === '{"test":true}' &&
        record.origin === 'http://127.0.0.1:8788',
    ),
  );

  console.log('验证原生 HLS 播放');

  playbackSession = true;

  await execute(
    4444,
    nativeSession,
    `
localStorage.setItem(
  'ym-video:custom-sources',
  JSON.stringify([
    {
      id: 'custom:native',
      name: '本机测试源',
      url: 'http://127.0.0.1:8788/catalog',
    },
  ]),
);
localStorage.setItem('ym-video:source', JSON.stringify('custom:native'));
location.href = '/player/custom%3Anative/movie';
`,
  );

  await until(async () =>
    execute(
      4444,
      nativeSession,
      `
return document.querySelector('video')?.readyState >= 2;
`,
    ),
  );

  await execute(
    4444,
    nativeSession,
    `
// 当前播放器的视频元素。
const video = document.querySelector('video');
video.muted = true;
video.play();
`,
  );

  await until(async () =>
    execute(
      4444,
      nativeSession,
      `
return document.querySelector('video')?.currentTime > 0.5;
`,
    ),
  );

  await execute(
    4444,
    nativeSession,
    `
// 当前播放器的视频元素。
const video = document.querySelector('video');
video.currentTime = 4;
video.playbackRate = 1.5;
`,
  );

  await until(async () =>
    execute(
      4444,
      nativeSession,
      `
return document.querySelector('video')?.currentTime >= 4;
`,
    ),
  );

  assert.equal(
    await execute(
      4444,
      nativeSession,
      `
return document.querySelector('video').playbackRate;
`,
    ),
    1.5,
  );

  // 全屏按钮对应的 WebDriver 元素标识。
  const fullscreenButton = await call<Record<string, string>>(
    4444,
    '/session/' + nativeSession + '/element',
    { using: 'css selector', value: 'button[data-control="全屏"]' },
  );

  await call(
    4444,
    '/session/' +
      nativeSession +
      '/element/' +
      fullscreenButton['element-6066-11e4-a52e-4f735466cecf'] +
      '/click',
    {},
  );

  await until(async () =>
    execute(4444, nativeSession, 'return !!document.fullscreenElement;'),
  );

  await until(async () =>
    invoke<boolean>(nativeSession, 'plugin:window|is_fullscreen', {
      label: 'main',
    }),
  );

  await execute(4444, nativeSession, 'document.exitFullscreen();');

  await until(async () =>
    execute(4444, nativeSession, 'return !document.fullscreenElement;'),
  );

  await until(
    async () =>
      !(await invoke<boolean>(nativeSession, 'plugin:window|is_fullscreen', {
        label: 'main',
      })),
  );

  await execute(
    4444,
    nativeSession,
    `
document.querySelector('[data-control="下一集"]').click();
`,
  );

  await until(async () =>
    execute(
      4444,
      nativeSession,
      `
return document.querySelector('.player-label')?.textContent.includes('第二集');
`,
    ),
  );

  await execute(
    4444,
    nativeSession,
    `
document.querySelector('button[data-action="player-back"]').click();
`,
  );

  await until(async () =>
    execute(
      4444,
      nativeSession,
      `
return (
  location.pathname === '/overview' && !!document.querySelector('[data-slot="catalogue-page"]')
);
`,
    ),
  );

  console.log(
    'Tauri 原生窗口、请求隔离、Cookie 重启恢复、取消、签名更新与真实 HLS 播放回归通过',
  );
} catch (error) {
  if (nativeSession) {
    // 失败时记录界面和本机请求路径，定位原生边界问题。
    const diagnostic = await execute(
      4444,
      nativeSession,
      `
      const video = document.querySelector('video');

      return {
        url: location.href,
        text: document.body.innerText.slice(0, 1500),
        video: video ? { src: video.currentSrc, ready: video.readyState, network: video.networkState, error: video.error?.message } : null,
      };
    `,
    ).catch(() => null);

    console.error(
      '原生回归诊断',
      diagnostic,
      records.slice(-20).map((record) => record.path),
    );
  }

  throw error;
} finally {
  if (browserSession) {
    await call(9515, '/session/' + browserSession, undefined, 'DELETE').catch(
      console.error,
    );
  }

  if (nativeSession) {
    await call(4444, '/session/' + nativeSession, undefined, 'DELETE').catch(
      console.error,
    );
  }

  edge.kill();

  native.kill();

  server.closeAllConnections();

  await new Promise((resolve) => server.close(resolve));

  await vite.close();
}
