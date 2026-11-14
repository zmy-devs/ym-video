import { createApp, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks';
import { Channel } from '@tauri-apps/api/core';
import { Toaster } from '@ym-video/ui/components/sonner';
import { useUpdateStore } from '../../src/stores/update-store';
import SettingsPage from '../../src/views/settings.vue';
import '../../src/styles/global.css';

// 验证真实 SDK、更新任务与设置组件之间的交互。
const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

// 等待 IPC 和 Vue 状态更新，超时保留具体场景。
const until = async (check: () => boolean) => {
  // 单次状态变化允许的最长等待时间。
  const deadline = Date.now() + 5000;

  while (!check()) {
    assert(Date.now() < deadline, '等待 Android 更新状态超时');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  await nextTick();
};

// APK 下载、安装权限和系统安装器按各自命令模拟。
const run = async () => {
  localStorage.clear();
  Object.defineProperty(window, 'isTauri', { configurable: true, value: true });

  // 服务端清单和本轮失败场景。
  let availableVersion = '6.1.6';
  let failCheck = false;
  let failDownload = false;
  let failInstall = false;
  let unknownLength = false;
  // 第二次下载使用本机直链验证本地更新入口。
  let localDownload = false;
  let permission = false;
  let grantPermission = false;

  // 计数用于验证重复操作与安装重试不会重新下载。
  let checks = 0;
  let downloads = 0;
  let installs = 0;
  let permissionRequests = 0;
  let finishDownload = () => {};

  mockIPC(async (command, args) => {
    // 在 IPC 边界收窄命令参数。
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

    if (command === 'request_api') {
      return {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            id: 'settings-test',
            userId: 'settings-user',
            expiresAt: '2099-01-01T00:00:00Z',
          },
          user: {
            id: 'settings-user',
            email: 'settings@example.com',
            username: '更新测试',
            emailVerified: true,
          },
        }),
      };
    }

    if (command === 'android_update_manifest') {
      checks += 1;

      if (failCheck) {
        throw { message: 'Android 更新清单尚未发布，请稍后再试' };
      }

      // 两种下载源使用相同的 APK 命名与安装流程。
      const downloadUrl = localDownload
        ? `http://127.0.0.1:18789/ym-video-${availableVersion}-android-arm64.apk`
        : `https://gitee.com/zmy-devs/ym-video/releases/download/v${availableVersion}/ym-video-${availableVersion}-android-arm64.apk`;

      return {
        version: availableVersion,
        url: downloadUrl,
      };
    }

    if (command === 'plugin:path|resolve_directory') {
      return '/data/user/0/com.zhangmingyang.ymvideo/cache';
    }

    if (command === 'plugin:path|join') {
      if (!Array.isArray(payload.paths)) {
        throw new Error('使用官方 path API 拼接缓存路径');
      }

      return payload.paths.join('/');
    }

    if (command === 'plugin:upload|download') {
      downloads += 1;
      assert(
        payload.filePath ===
          '/data/user/0/com.zhangmingyang.ymvideo/cache/ym-video-update.apk',
        'APK 下载到应用缓存',
      );
      assert(
        typeof payload.url === 'string' &&
          payload.url.startsWith(
            localDownload
              ? 'http://127.0.0.1:18789/'
              : 'https://gitee.com/zmy-devs/ym-video/releases/download/v',
          ),
        'APK 从清单中的对应版本直链下载',
      );

      // 官方 Channel 使用累计下载量，单块大小不等于总进度。
      const channel = payload.onProgress;

      assert(channel instanceof Channel, '使用官方下载进度通道');

      if (!(channel instanceof Channel)) {
        throw new Error('下载进度通道无效');
      }

      channel.onmessage({
        progress: 2,
        progressTotal: 42,
        total: unknownLength ? 0 : 100,
        transferSpeed: 10,
      });
      await new Promise<void>((resolve) => {
        finishDownload = resolve;
      });

      if (failDownload) {
        throw '网络中断';
      }

      return;
    }

    if (command === 'plugin:android-installer|can_install') {
      return permission;
    }

    if (command === 'plugin:android-installer|request_install_permission') {
      permissionRequests += 1;
      permission = grantPermission;

      return;
    }

    if (command === 'plugin:android-installer|install') {
      installs += 1;
      assert(permission, '获得权限后才打开安装器');
      assert(
        payload.path ===
          '/data/user/0/com.zhangmingyang.ymvideo/cache/ym-video-update.apk',
        '安装使用已下载的同一个 APK',
      );

      if (failInstall) {
        throw '无法打开系统安装器';
      }

      return;
    }

    throw new Error(`Android 不应调用此命令：${command}`);
  });

  // 每次启动创建独立应用状态，设置组件使用同一个 Pinia。
  const pinia = createPinia();
  setActivePinia(pinia);

  // 应用级更新任务不随设置组件关闭而消失。
  const update = useUpdateStore();
  const stop = update.init();
  await until(() => update.version === '6.1.6');
  assert(checks === 0, '默认关闭自动更新');

  // 操作真实设置界面并检查用户可见的提示。
  const fixture = document.getElementById('fixture');

  if (!fixture) {
    throw new Error('缺少设置测试容器');
  }

  // 挂载与应用相同的弹出提示，验证用户可见的失败原因。
  const toaster = createApp(Toaster, { position: 'top-center' });
  toaster.mount('#toasts');

  // 错误只在全局弹出提示中展示。
  const hasToast = (text: string) =>
    !!document
      .querySelector('[data-sonner-toaster]')
      ?.textContent?.includes(text);

  // 根据按钮文案触发组件实际事件。
  const click = (label: string) => {
    // 当前可见且可操作的按钮。
    const button = [...fixture.querySelectorAll('button')].find(
      (item) =>
        item.textContent?.trim() === label ||
        [...item.querySelectorAll('span')].some(
          (span) => span.textContent?.trim() === label,
        ),
    );
    assert(button && !button.disabled, `找不到可用按钮：${label}`);
    button?.click();
  };

  // 首次检查覆盖相同版本和旧版本。
  const app = createApp(SettingsPage).use(pinia);
  app.mount(fixture);
  await nextTick();

  // 实际移动设置页的开关可用，并立即检查与保存偏好。
  const autoUpdateSwitch = fixture.querySelector(
    '#settings-mobile-auto-update + button',
  );

  if (!(autoUpdateSwitch instanceof HTMLButtonElement)) {
    throw new Error('移动设置页缺少自动更新开关');
  }

  assert(!autoUpdateSwitch.disabled, '移动设置页的自动更新可操作');
  autoUpdateSwitch.click();
  await until(() => update.autoUpdate && update.status === 'idle');
  await until(() => hasToast('当前已是最新版本'));
  assert(
    localStorage.getItem('ym-video:auto-update') === 'true',
    '移动设置页保存自动更新偏好',
  );
  autoUpdateSwitch.click();
  await until(() => !update.autoUpdate);

  click('检查更新');
  await until(() => update.status === 'idle');
  availableVersion = '6.1.5';
  await update.check();
  assert(update.status === 'idle' && downloads === 0, '旧版本不会降级安装');

  failCheck = true;
  click('检查更新');
  await until(() => update.status === 'idle');
  await until(() => hasToast('更新失败'));
  assert(
    !fixture.textContent?.includes('更新失败'),
    '设置列表只展示操作与进度',
  );
  assert(
    [...fixture.querySelectorAll('button')].some(
      (button) =>
        button.querySelector('span')?.textContent === '检查更新' &&
        !button.disabled,
    ),
    '检查更新标题保持固定且可再次检查',
  );
  failCheck = false;
  availableVersion = '6.10.0';
  failDownload = true;
  click('检查更新');
  await until(() => update.progress === 42);
  assert(fixture.textContent?.includes('42%'), '按累计字节显示下载进度');
  await update.check();
  assert(checks === 5 && downloads === 1, '下载期间不重复检查');
  assert(
    [...fixture.querySelectorAll('button')].some(
      (button) =>
        button.querySelector('span')?.textContent === '检查更新' &&
        button.textContent?.includes('42%') &&
        button.disabled,
    ),
    '下载期间展示忙碌状态，避免重复操作',
  );
  finishDownload();
  await until(() => update.status === 'idle');
  await until(() => hasToast('更新失败'));

  failDownload = false;
  unknownLength = true;
  localDownload = true;
  click('检查更新');
  await until(() => downloads === 2 && update.status === 'downloading');
  assert(update.progress === null, '未知总量时不显示百分比');
  app.unmount();
  finishDownload();
  await until(() => update.status === 'downloaded');
  assert(installs === 0, '关闭设置后完成下载，等待用户确认');
  await update.check();
  assert(checks === 6 && downloads === 2, '已下载时保留安装资源，不重新检查');

  // 返回设置后继续安装已下载的更新。
  const reopened = createApp(SettingsPage).use(pinia);
  reopened.mount(fixture);
  await nextTick();
  assert(fixture.textContent?.includes('安装更新'), '重开移动设置保留安装操作');
  click('安装更新');
  await until(() => hasToast('请允许安装未知应用'));
  assert(
    installs === 0 &&
      permissionRequests === 1 &&
      update.status === 'downloaded',
    '拒绝权限后保留下载资源',
  );

  grantPermission = true;
  failInstall = true;
  click('安装更新');
  await until(() => hasToast('安装失败'));
  assert(
    permissionRequests === 2 && downloads === 2,
    '授权后重试安装，无需重新下载',
  );
  failInstall = false;
  click('安装更新');
  await until(() => update.status === 'installer-opened');
  await update.check();
  assert(checks === 6 && downloads === 2, '安装器打开后可复用同一安装包');
  assert(
    [...fixture.querySelectorAll('button')].some(
      (button) =>
        button.querySelector('span')?.textContent === '检查更新' &&
        button.textContent?.includes('再次安装'),
    ),
    '安装器打开后保留固定标题与再次安装操作',
  );
  click('再次安装');
  await until(() => update.status === 'installer-opened');
  assert(
    installs === 3 && permissionRequests === 2 && downloads === 2,
    '返回应用后可直接再次安装',
  );
  reopened.unmount();
  stop();
  update.$dispose();

  // 已开启的自动更新在新启动时检查，并遵守每日频率。
  localStorage.setItem('ym-video:auto-update', 'true');
  localStorage.setItem('ym-video:last-update-check', '0');
  availableVersion = '6.1.6';
  setActivePinia(createPinia());

  // 自动检查不依赖打开设置界面。
  const automatic = useUpdateStore();
  const stopAutomatic = automatic.init();
  await until(() => automatic.status === 'idle' && checks === 7);
  assert(checks === 7, 'Android 启动时自动检查更新');
  stopAutomatic();
  automatic.$dispose();

  clearMocks();
  Reflect.deleteProperty(window, 'isTauri');
  setActivePinia(createPinia());

  // 移动浏览器预览只渲染页面，不发起原生命令。
  const browser = useUpdateStore();
  browser.init()();
  await browser.check();
  assert(browser.status === 'idle', '浏览器预览不调用安装插件');
  browser.$dispose();
  toaster.unmount();
  localStorage.clear();
};

run()
  .then(() => {
    document.documentElement.dataset.result = 'passed';
    document.getElementById('status')?.replaceChildren('Android 更新测试通过');
  })
  .catch((error: unknown) => {
    document.documentElement.dataset.result = 'failed';
    document.getElementById('status')?.replaceChildren(String(error));
  });
