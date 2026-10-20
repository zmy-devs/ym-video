import { createApp, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useUpdateStore } from '../../src/stores/update';
import UpdateSettings from '../../src/dialogs/settings/update-settings.vue';

// 断言失败时把具体原因展示在测试页面。
const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

// 使用模拟 IPC 验证状态与真实组件，不访问更新服务器或重启应用。
const run = async () => {
  localStorage.removeItem('ym-video:auto-update');
  localStorage.removeItem('ym-video:last-update-check');

  const listeners = new Map<string, (...args: unknown[]) => void>();
  let checks = 0;
  let installs = 0;
  let fail = false;

  window.ipc = {
    getVersion: async () => '6.0.0',
    checkForUpdates: async () => {
      checks += 1;
      if (fail) {
        throw new Error('模拟网络故障');
      }
      listeners.get('update-progress')?.({}, 12);
      return '6.1.0';
    },
    installUpdate: async () => {
      installs += 1;
    },
    on: (channel: string, listener: (...args: never[]) => void) => {
      const forward = (...args: unknown[]) =>
        Reflect.apply(listener, undefined, args);
      listeners.set(channel, forward);
      return () => {
        listeners.delete(channel);
      };
    },
  };

  const pinia = createPinia();
  setActivePinia(pinia);
  const update = useUpdateStore();
  const stop = update.init();
  await nextTick();
  assert(checks === 0, '默认关闭自动更新');
  await update.check();
  assert(update.status === 'downloading', '检测到新版本后下载');
  assert(update.message.includes('v6.1.0'), '提前到达的下载事件不丢失版本');
  listeners.get('update-progress')?.({}, 42.8);
  assert(update.progress === 42, '正确跳过 Electron 事件参数并读取进度');
  await update.check();
  assert(checks === 1, '下载期间禁止重复检查');

  const fixture = document.getElementById('fixture');
  if (!fixture) {
    throw new Error('缺少测试容器');
  }
  const app = createApp(UpdateSettings).use(pinia);
  app.mount(fixture);
  await nextTick();
  assert(fixture.textContent?.includes('42%'), '界面展示下载进度');
  assert(!fixture.querySelector('[role="status"]'), '不再显示下方独立提示');
  update.status = 'up-to-date';
  await nextTick();
  assert(fixture.textContent?.includes('已是最新版'), '右侧显示已是最新版');
  assert(
    !Array.from(fixture.querySelectorAll('button')).some(
      (button) => button.textContent?.trim() === '检查更新',
    ),
    '已是最新版时不再显示检查按钮',
  );
  app.unmount();
  listeners.get('update-downloaded')?.({});
  assert(update.status === 'downloaded', '关闭设置后仍收到下载完成事件');
  await update.install();
  assert(installs === 1, '下载完成后可安装');
  update.installing = false;

  listeners.get('update-error')?.({});
  fail = true;
  await update.check();
  assert(update.status === 'error', '网络故障可恢复');
  fail = false;
  update.setAutoUpdate(true);
  await nextTick();
  assert(update.status === 'downloading', '启用自动更新会立即重试');
  assert(
    localStorage.getItem('ym-video:auto-update') === 'true',
    '开关已持久化',
  );
  stop();
  assert(listeners.size === 0, '应用卸载清理监听');

  delete window.ipc;
  setActivePinia(createPinia());
  const browserUpdate = useUpdateStore();
  browserUpdate.init()();
  await browserUpdate.check();
  assert(browserUpdate.status === 'idle', '普通浏览器不启动更新');
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
