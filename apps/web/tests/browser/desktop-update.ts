import { createApp, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import type { Channel } from '@tauri-apps/api/core';
import type { DownloadEvent } from '@tauri-apps/plugin-updater';
import { useUpdateStore } from '../../src/stores/update-store';
import UpdateSettings from '../../src/components/dialogs/settings/update-settings.vue';

// 断言当前场景是否满足预期。
const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

// 等待异步界面状态达到测试条件。
const until = async (check: () => boolean) => {
  // 更新状态在本轮测试中的等待截止时间。
  const deadline = Date.now() + 5000;

  while (!check()) {
    if (Date.now() > deadline) {
      throw new Error('等待更新状态超时');
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

// 官方 updater 的命令、Channel 和下载资源保留真实调用契约。
const run = async () => {
  localStorage.removeItem('ym-video:auto-update');

  localStorage.removeItem('ym-video:last-update-check');

  // 本轮测试发起的更新检查次数。
  let checks = 0;

  // 本轮测试发起的安装次数。
  let installs = 0;

  // 模拟更新服务是否返回网络故障。
  let fail = false;

  // 主动完成本轮模拟下载的控制函数。
  let finishDownload: (() => void) | undefined;

  Object.defineProperty(window, 'isTauri', { configurable: true, value: true });

  mockIPC(async (command, args) => {
    // 通过 Tauri mock 收到的命令参数。
    const payload =
      args &&
      !Array.isArray(args) &&
      !(args instanceof ArrayBuffer) &&
      !ArrayBuffer.isView(args)
        ? args
        : {};

    if (command === 'plugin:app|version') {
      return '6.1.6';
    }

    if (command === 'plugin:updater|check') {
      checks += 1;

      if (fail) {
        throw new Error('模拟网络故障');
      }

      return { rid: 1, currentVersion: '6.1.6', version: '6.2.0', rawJson: {} };
    }

    if (command === 'plugin:updater|download') {
      // updater 用于回传下载进度的官方 Channel。
      const channel = payload.onEvent as Channel<DownloadEvent>;

      channel.onmessage({ event: 'Started', data: { contentLength: 100 } });

      channel.onmessage({ event: 'Progress', data: { chunkLength: 42 } });

      await new Promise<void>((resolve) => {
        finishDownload = resolve;
      });

      return 2;
    }

    if (command === 'plugin:updater|install') {
      installs += 1;
    }

    return null;
  });

  // 本轮场景独立使用的状态容器。
  const pinia = createPinia();

  setActivePinia(pinia);

  // updater 持有的版本信息和已下载资源。
  const update = useUpdateStore();

  // 本次创建的订阅清理函数。
  const stop = update.init();

  await nextTick();

  assert(checks === 0, '默认关闭自动更新');

  // 等待完成的更新检查与下载任务。
  const checking = update.check();

  await until(() => update.progress === 42);

  assert(update.status === 'downloading', '检查后进入下载');

  await update.check();

  assert(checks === 1, '下载期间合并重复检查');

  // 本轮测试独立使用的临时目录或挂载容器。
  const fixture = document.getElementById('fixture');

  if (!fixture) {
    throw new Error('缺少测试容器');
  }

  // 挂载真实设置组件的测试应用。
  const app = createApp(UpdateSettings).use(pinia);

  app.mount(fixture);

  await nextTick();

  assert(fixture.textContent?.includes('42%'), '设置显示下载进度');

  app.unmount();

  finishDownload?.();

  await checking;

  assert(
    update.status === 'downloaded' && update.progress === 100,
    '关闭设置后仍完成下载',
  );

  await update.install();

  assert(installs === 1, '下载成功后安装');

  update.status = 'error';

  fail = true;

  await update.check();

  assert(update.status === 'error', '网络故障反馈错误');

  fail = false;

  update.setAutoUpdate(true);

  await until(() => update.status === 'downloading');

  assert(
    localStorage.getItem('ym-video:auto-update') === 'true',
    '自动检查偏好保存',
  );

  finishDownload?.();

  await until(() => update.status === 'downloaded');

  stop();

  // 原生资源释放完成后再移除 IPC 模拟。
  await new Promise((resolve) => setTimeout(resolve, 0));

  clearMocks();

  Reflect.deleteProperty(window, 'isTauri');

  setActivePinia(createPinia());

  // 浏览器环境下创建的更新状态。
  const browserUpdate = useUpdateStore();

  browserUpdate.init()();

  await browserUpdate.check();

  assert(browserUpdate.status === 'idle', '浏览器独立运行');

  localStorage.removeItem('ym-video:auto-update');
};

run()
  .then(() => {
    document.documentElement.dataset.result = 'passed';

    document.getElementById('status')?.replaceChildren('客户端更新测试通过');
  })
  .catch((error: unknown) => {
    document.documentElement.dataset.result = 'failed';

    document.getElementById('status')?.replaceChildren(String(error));
  });
