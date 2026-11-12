import { createApp, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { Channel } from '@tauri-apps/api/core';
import { Toaster } from '@ym-video/ui/components/sonner';
import { useUpdateStore } from '../../src/stores/update-store';
import UpdateSettings from '../../src/components/dialogs/settings/update-settings.vue';
import '../../src/styles/global.css';

// 断言用户操作和原生资源是否符合更新流程。
const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

// 等待原生回调和 Vue 界面更新完成。
const until = async (check: () => boolean) => {
  // 本场景允许的最长等待时间。
  const deadline = Date.now() + 5000;

  while (!check()) {
    if (Date.now() >= deadline) {
      throw new Error('等待更新状态超时');
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  await nextTick();
};

// 使用真实 updater SDK 与设置组件，模拟原生 IPC 的成功和失败响应。
const run = async () => {
  localStorage.clear();

  // 原生调用次数用于确认重复点击、安装重试不会重复下载。
  let checks = 0;
  let downloads = 0;
  let installs = 0;

  // 当前测试服务返回的版本与失败场景。
  let available = false;
  let failCheck = false;
  let failDownload = false;
  let failInstall = false;
  let unknownLength = false;

  // 测试控制下载结束时机，覆盖关闭设置后继续下载。
  let finishDownload = () => {};

  // 模拟后端保留的更新信息与安装包资源。
  const resources = new Set<number>();

  Object.defineProperty(window, 'isTauri', { configurable: true, value: true });

  mockIPC(async (command, args) => {
    // IPC 数据在入口收窄后按官方命令契约处理。
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

      assert(payload.timeout === 10000, '版本检查设置网络超时');

      if (failCheck) {
        throw '更新服务不可用';
      }

      if (!available) {
        return null;
      }

      resources.add(checks * 2);

      return {
        rid: checks * 2,
        currentVersion: '6.1.6',
        version: '6.2.0',
        body: '改善播放体验',
        rawJson: {},
      };
    }

    if (command === 'plugin:updater|download') {
      downloads += 1;

      // SDK 通过真实 Channel 接收进度。
      const channel = payload.onEvent;

      if (!(channel instanceof Channel) || typeof payload.rid !== 'number') {
        throw new Error('下载 IPC 参数无效');
      }

      channel.onmessage({
        event: 'Started',
        data: unknownLength ? {} : { contentLength: 100 },
      });
      channel.onmessage({ event: 'Progress', data: { chunkLength: 42 } });

      await new Promise<void>((resolve) => {
        finishDownload = resolve;
      });

      if (failDownload) {
        throw '更新安装包签名无效';
      }

      channel.onmessage({ event: 'Finished' });
      resources.add(payload.rid + 1);

      return payload.rid + 1;
    }

    if (command === 'plugin:updater|install') {
      installs += 1;

      assert(payload.restartAfterInstall === true, '安装后自动重启应用');
      assert(
        typeof payload.bytesRid === 'number' && resources.has(payload.bytesRid),
        '安装使用已下载并校验的资源',
      );

      if (failInstall) {
        throw '无法启动安装程序';
      }

      if (typeof payload.bytesRid === 'number') {
        resources.delete(payload.bytesRid);
      }

      return;
    }

    if (
      command === 'plugin:resources|close' &&
      typeof payload.rid === 'number'
    ) {
      resources.delete(payload.rid);
    }
  });

  // 每组应用生命周期独立创建 Pinia，设置组件共享更新任务。
  const pinia = createPinia();

  setActivePinia(pinia);

  // 本轮更新任务与应用卸载清理函数。
  const update = useUpdateStore();
  const stop = update.init();

  await until(() => update.version === '6.1.6');

  assert(checks === 0, '默认关闭自动更新');

  // 真实设置组件用于验证按钮可用性和状态文案。
  const fixture = document.getElementById('fixture');

  if (!fixture) {
    throw new Error('缺少设置测试容器');
  }

  // 桌面失败原因通过与应用相同的弹出提示展示。
  const toaster = createApp(Toaster, { position: 'top-center' });
  toaster.mount('#toasts');

  // 等待全局提示完成渲染。
  const hasToast = (text: string) =>
    !!document
      .querySelector('[data-sonner-toaster]')
      ?.textContent?.includes(text);

  // 按可见文案操作界面，避免绕过组件事件。
  const click = (label: string) => {
    // 当前可见且可操作的按钮。
    const button = [...fixture.querySelectorAll('button')].find(
      (item) => item.textContent?.trim() === label,
    );

    if (!button || button.disabled) {
      throw new Error(`找不到可用按钮：${label}`);
    }

    button.click();
  };

  // 首次挂载设置并检查当前已是最新版本的场景。
  const app = createApp(UpdateSettings).use(pinia);

  app.mount(fixture);
  await nextTick();
  click('检查更新');
  await until(() => update.status === 'up-to-date');
  assert(fixture.textContent?.includes('当前已是最新版本'), '显示检查结果');
  assert(
    Number(localStorage.getItem('ym-video:last-update-check')) > 0,
    '成功检查记录时间',
  );

  failCheck = true;
  click('检查更新');
  await until(() => update.status === 'error');
  await until(() => hasToast('检查更新失败'));
  assert(
    !fixture.textContent?.includes('检查更新失败'),
    '检查失败由弹出提示展示',
  );

  failCheck = false;
  available = true;
  failDownload = true;
  click('检查更新');
  await until(() => update.progress === 42);
  assert(fixture.textContent?.includes('42%'), '设置显示下载进度');
  await update.check();
  assert(checks === 3 && downloads === 1, '下载期间合并重复检查');
  finishDownload();
  await until(() => update.status === 'error' && resources.size === 0);
  await until(() => hasToast('下载或校验失败'));

  failDownload = false;
  unknownLength = true;
  click('检查更新');
  await until(() => downloads === 2 && update.status === 'downloading');
  assert(update.progress === null, '下载总量未知时不展示错误百分比');
  app.unmount();
  finishDownload();
  await until(() => update.status === 'downloaded');
  assert(
    update.progress === 100 && installs === 0,
    '关闭设置后继续下载并等待确认',
  );

  // 重开设置使用同一更新任务，保留安装操作。
  const reopened = createApp(UpdateSettings).use(pinia);

  reopened.mount(fixture);
  await nextTick();
  assert(
    fixture.textContent?.includes('安装并重启'),
    '重开桌面设置保留安装操作',
  );
  assert(
    fixture
      .querySelector('a')
      ?.href.startsWith('https://gitee.com/zmy-devs/ym-video/'),
    '发布说明使用 Gitee 仓库',
  );

  failInstall = true;
  click('安装并重启');
  await until(() => update.errorType === 'install');
  assert(
    update.status === 'downloaded' && resources.size === 2,
    '安装失败保留下载资源',
  );
  await until(() => hasToast('安装失败'));

  failInstall = false;
  click('安装并重启');
  await until(() => installs === 2 && resources.size === 1);
  assert(downloads === 2, '重试安装无需重新下载');
  reopened.unmount();
  stop();
  await until(() => resources.size === 0);
  update.$dispose();

  available = false;
  localStorage.setItem('ym-video:auto-update', 'true');
  localStorage.setItem('ym-video:last-update-check', String(Date.now()));
  setActivePinia(createPinia());

  // 当天已完成检查时，启动应用只读取本地版本。
  const recent = useUpdateStore();
  const stopRecent = recent.init();

  await until(() => recent.version === '6.1.6');
  assert(checks === 4, '当天成功检查后不自动重复检查');
  stopRecent();
  recent.$dispose();

  localStorage.setItem('ym-video:last-update-check', '0');
  setActivePinia(createPinia());

  // 超过一天后，开启自动更新的应用会重新检查版本。
  const automatic = useUpdateStore();
  const stopAutomatic = automatic.init();

  await until(() => automatic.status === 'up-to-date');
  assert(checks === 5, '启用自动更新后按天检查');
  stopAutomatic();
  automatic.$dispose();

  clearMocks();
  Reflect.deleteProperty(window, 'isTauri');
  setActivePinia(createPinia());

  // 浏览器开发页不调用原生更新命令。
  const browser = useUpdateStore();

  browser.init()();
  await browser.check();
  assert(browser.status === 'idle' && checks === 5, '浏览器预览不发起原生更新');
  browser.$dispose();
  toaster.unmount();
  localStorage.clear();
};

run()
  .then(() => {
    document.documentElement.dataset.result = 'passed';
    document.getElementById('status')?.replaceChildren('Windows 更新测试通过');
  })
  .catch((error: unknown) => {
    document.documentElement.dataset.result = 'failed';
    document.getElementById('status')?.replaceChildren(String(error));
  });
