import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

// 按目标平台使用真实构建模式运行共用更新设置。
const directory = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 命令行只选择本次测试的平台和页面。
const mode = process.argv[2] === 'mobile' ? 'mobile' : 'desktop';

// 更新测试独立于已运行的桌面程序，不覆盖其可执行文件。
const vite = await createServer({
  root: directory,
  mode,
  server: { host: '127.0.0.1', port: 5182, strictPort: true },
});

// 浏览器驱动复用桌面回归测试的本机配置。
const cargoHome = process.env.CARGO_HOME || join(homedir(), '.cargo');
const driver = join(cargoHome, 'bin/msedgedriver.exe');

assert(
  existsSync(driver),
  '请在 CARGO_HOME/bin 安装匹配 Edge 的 msedgedriver.exe',
);

// 通过 WebDriver 启动隔离的无头浏览器。
const edge = spawn(driver, ['--port=9517'], {
  stdio: 'ignore',
  windowsHide: true,
});

// 当前测试使用的浏览器会话。
let session = '';

// 发送 WebDriver 命令并检查响应。
const call = async (
  path: string,
  body?: unknown,
  method = 'POST',
): Promise<unknown> => {
  // WebDriver 按 W3C 协议返回命令结果。
  const response = await fetch(`http://127.0.0.1:9517${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const result: unknown = await response.json();

  assert(response.ok, JSON.stringify(result));
  assert(result && typeof result === 'object' && 'value' in result);

  return result.value;
};

try {
  await vite.listen();

  // 等待驱动就绪，启动失败时保留原始错误。
  const readyDeadline = Date.now() + 10000;

  while (true) {
    try {
      await call('/status', undefined, 'GET');
      break;
    } catch (cause) {
      if (Date.now() >= readyDeadline) {
        throw cause;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // 单独的浏览器用户目录避免影响日常登录和本地设置。
  const browser = await call('/session', {
    capabilities: {
      alwaysMatch: {
        browserName: 'MicrosoftEdge',
        'ms:edgeOptions': {
          args: [
            '--headless=new',
            mode === 'mobile'
              ? '--window-size=390,844'
              : '--window-size=1280,800',
          ],
        },
      },
    },
  });

  assert(
    browser &&
      typeof browser === 'object' &&
      'sessionId' in browser &&
      typeof browser.sessionId === 'string',
  );
  session = browser.sessionId;

  await call(`/session/${session}/url`, {
    url: `http://127.0.0.1:5182/tests/browser/${mode}-update.html`,
  });

  // 测试页面串行覆盖检查、下载、签名失败、安装重试与自动检查。
  const deadline = Date.now() + 60000;

  while (true) {
    // 只返回最终测试状态，失败文案包含对应断言。
    const result = await call(`/session/${session}/execute/sync`, {
      script:
        "return { state: document.documentElement.dataset.result, message: document.querySelector('#status')?.textContent };",
      args: [],
    });

    assert(
      result &&
        typeof result === 'object' &&
        'state' in result &&
        'message' in result,
    );
    assert.notEqual(result.state, 'failed', String(result.message));

    if (result.state === 'passed') {
      console.log(result.message);
      break;
    }

    assert(Date.now() < deadline, `更新测试超时：${String(result.message)}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
} finally {
  if (session) {
    await call(`/session/${session}`, undefined, 'DELETE').catch(console.error);
  }

  edge.kill();
  await vite.close();
}
