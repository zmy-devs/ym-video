import { createApp, nextTick } from 'vue';
import { createPinia } from 'pinia';
import { emptyHistory } from '@ym-video/history';
import { useLibraryStore } from '../../src/stores/library';
import { useThemeStore } from '../../src/stores/theme';
import '../../src/styles/global.css';

// 断言失败后停止当前场景并显示原因。
const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

// 等待实际请求及组件状态，覆盖逐步延长间隔的五次重试。
const until = async (check: () => boolean) => {
  // 单个场景允许完成全部自动重试。
  const deadline = Date.now() + 20_000;

  while (!check()) {
    if (Date.now() > deadline) {
      throw new Error('等待页面状态超时');
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  await nextTick();
};

// 测试结果显示在页面，保留实际渲染供人工复查。
const report = (message: string) => {
  // 当前通过的场景。
  const item = document.createElement('li');

  item.textContent = `通过：${message}`;
  document.querySelector('#results')?.append(item);
};

// 使用真实根组件和 IPC 模拟数据，不访问账号、播放源或远程视频。
const run = async () => {
  // 原始浏览器环境在测试结束后恢复。
  const originalFetch = window.fetch;
  const originalIpc = window.ipc;
  const originalUrl = location.href;
  // 模拟原生全屏事件后恢复浏览器的只读属性。
  const fullscreenDescriptor = Object.getOwnPropertyDescriptor(
    document,
    'fullscreenElement',
  );
  const keys = ['theme-mode', 'theme-color', 'volume', 'source'];
  const previous = keys.map((key) => localStorage.getItem(`ym-video:${key}`));
  const calls = new Map<string, number>();
  // 记录同一请求的发起时间，确认失败后等待足够时间才重试。
  const requestTimes: number[] = [];
  const themes: string[] = [];
  const pendingHistory: Array<(response: Response) => void> = [];
  const ownerId = 'playback-ui-test';
  let phase = 'failure';

  localStorage.setItem('ym-video:theme-mode', '"light"');
  localStorage.setItem('ym-video:volume', '0.5');

  window.fetch = async (input) => {
    // 模拟会话和后台历史读取，其他请求视为测试遗漏。
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      location.origin,
    );

    if (url.pathname.startsWith('/api/auth/')) {
      return Response.json({
        user: { id: ownerId, role: 'user', name: '界面测试' },
        session: { id: 'playback-ui-session' },
      });
    }

    if (url.pathname.startsWith('/api/v1/history')) {
      return new Promise<Response>((resolve) => pendingHistory.push(resolve));
    }

    throw new Error(`测试禁止访问：${url.href}`);
  };

  window.ipc = {
    getVersion: async () => '6.1.0',
    checkForUpdates: async () => false,
    installUpdate: async () => undefined,
    on: () => () => undefined,
    toggleTheme: async (mode, resolved) => {
      themes.push(`${mode}:${resolved}`);
    },
    requestResource: async (address) => {
      // 记录每个来源与操作的真实请求次数。
      const url = new URL(address);
      const source =
        url.hostname === 'recovery.example' ? 'recovery' : 'initial';
      const action = url.searchParams.has('ids')
        ? 'detail'
        : url.searchParams.get('ac');
      const key = `${source}:${action}`;
      const count = (calls.get(key) ?? 0) + 1;

      calls.set(key, count);

      if (key === 'initial:list') {
        requestTimes.push(performance.now());
      }

      if (
        phase === 'failure' ||
        (phase === 'cancel' && source === 'recovery')
      ) {
        throw new Error('测试接口超时');
      }

      if (phase === 'recover' && source === 'recovery' && count <= 2) {
        throw new Error('测试短暂故障');
      }

      if (action === 'list') {
        return {
          class: [{ type_id: 1, type_pid: 0, type_name: `${source}分类` }],
        };
      }

      return {
        list: [
          {
            vod_id: 'movie',
            vod_name: `${source}测试影片`,
            vod_play_url:
              '第1集$http://localhost:5180/tests/unavailable.mp4#第2集$http://localhost:5180/tests/unavailable.mp4',
          },
        ],
        pagecount: 1,
      };
    },
  };

  window.history.replaceState(null, '', '/overview');

  // 安装模拟环境后再创建真实路由与账号客户端。
  const { router } = await import('../../src/router');
  const { default: App } = await import('../../src/App.vue');
  const { useHistoryStore } = await import('../../src/stores/history');
  const pinia = createPinia();
  const library = useLibraryStore(pinia);
  const theme = useThemeStore(pinia);

  library.selected = 'baofeng';
  library.sources = [
    { id: 'baofeng', name: '初始源' },
    { id: 'recovery', name: '恢复源', url: 'https://recovery.example/api' },
  ];

  // 测试挂载点不使用生产 #app，单独提供相同的标题栏预留。
  const fixture = document.querySelector<HTMLElement>('#fixture');

  if (!fixture) {
    throw new Error('缺少测试容器');
  }

  fixture.style.paddingTop = 'var(--desktop-title-bar-height)';

  const app = createApp(App).use(pinia).use(router);

  app.mount(fixture);

  try {
    const categories = library.loadCategories();

    await until(() => calls.has('initial:detail'));
    assert(
      fixture.querySelector('.movie-grid[role="status"]'),
      '首次请求与重试期间保持影片骨架屏',
    );
    await categories;
    await until(
      () => calls.get('initial:detail') === 6 && Boolean(library.categoryError),
    );
    await until(() => Boolean(document.querySelector('[data-sonner-toast]')));
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert(
      calls.get('initial:list') === 6 && calls.get('initial:detail') === 6,
      '首次失败后最多自动重试五次',
    );
    assert(
      requestTimes
        .slice(1)
        .every(
          (time, index) =>
            time - requestTimes[index] >= (index + 1) * 1000 - 30,
        ),
      '重试间隔依次至少为一秒、两秒、三秒、四秒和五秒',
    );
    assert(
      fixture.querySelector('.movie-grid[role="status"]'),
      '重试耗尽后仍保持影片骨架屏',
    );
    assert(
      fixture.querySelector('#category-menu [data-slot="skeleton"]'),
      '重试耗尽后仍保持分类骨架屏',
    );
    assert(
      !fixture.textContent?.includes('测试接口超时') &&
        !fixture.textContent?.includes('重新加载'),
      '不再渲染原始错误及重试占位',
    );
    assert(
      document.body.textContent?.includes('分类加载失败，请刷新后重试') &&
        document.body.textContent?.includes('影片加载失败，请刷新后重试'),
      '失败最终仅以 toast 提示刷新',
    );
    const homeTitleBar = fixture.querySelector('.desktop-title-bar');

    assert(
      homeTitleBar &&
        Number.parseFloat(getComputedStyle(homeTitleBar).borderBottomWidth) > 0,
      '主页标题栏有底边框',
    );
    report('分类和影片各重试五次后停止，保留骨架屏并显示刷新 toast');

    phase = 'recover';
    await library.select('recovery');
    await until(() =>
      Boolean(fixture.textContent?.includes('recovery测试影片')),
    );
    assert(
      calls.get('recovery:list') === 3 && calls.get('recovery:detail') === 3,
      '短暂失败后自动恢复，不继续重复请求',
    );
    report('切换来源后重置重试次数，短暂故障自动恢复列表及分类');

    phase = 'healthy';
    await library.select('baofeng');
    await until(() =>
      Boolean(fixture.textContent?.includes('initial测试影片')),
    );
    phase = 'cancel';

    const cancelled = library.select('recovery');

    await until(
      () =>
        calls.get('recovery:list') === 4 && calls.get('recovery:detail') === 4,
    );
    await library.select('baofeng');
    await cancelled;
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert(
      calls.get('recovery:list') === 4 && calls.get('recovery:detail') === 4,
      '切源必须取消旧请求的重试计时器',
    );
    assert(
      library.categories[0]?.name === 'initial分类',
      '旧任务不能覆盖新源分类',
    );
    report('切源会取消分类和影片的旧重试，迟到结果不会覆盖新列表');

    phase = 'healthy';
    pendingHistory
      .splice(0)
      .forEach((resolve) => resolve(Response.json(emptyHistory(ownerId))));
    await router.push('/player/baofeng/movie');
    await until(
      () =>
        fixture.textContent?.includes('initial测试影片') === true &&
        Boolean(fixture.querySelector('video[src]')),
    );
    assert(
      theme.mode === 'light' && theme.resolved === 'dark',
      '播放器固定暗色但保留亮色偏好',
    );
    assert(
      document.documentElement.classList.contains('dark'),
      '所有 body 弹层继承暗色',
    );
    assert(
      themes.at(-1) === 'light:dark',
      '原生窗口按钮使用暗色外观且不改全局主题模式',
    );
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await until(() => fixture.textContent?.includes('音量：45%') === true);
    assert(
      !fixture.querySelector('[class~="bg-white/40"]'),
      '音量不再显示横向进度条',
    );

    // 使用真实组件的全屏事件和媒体事件验证互斥，不下载远程媒体。
    const surface = fixture.querySelector('main');
    const video = fixture.querySelector('video');
    const controls =
      fixture.querySelector('.player-label')?.parentElement?.parentElement;

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: surface,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    video?.dispatchEvent(new Event('play'));
    surface?.dispatchEvent(new PointerEvent('pointerleave'));
    await until(() =>
      Boolean(fixture.querySelector('main > div[aria-hidden="true"]')),
    );
    assert(
      controls && getComputedStyle(controls).display === 'none',
      '收起控制栏后才显示底部细进度',
    );
    surface?.dispatchEvent(new PointerEvent('pointermove'));
    await nextTick();
    assert(
      controls &&
        getComputedStyle(controls).display !== 'none' &&
        !fixture.querySelector('main > div[aria-hidden="true"]'),
      '唤起完整控件后细进度立即隐藏',
    );
    video?.dispatchEvent(new Event('pause'));
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    await nextTick();
    report('全屏播放时控制栏与细进度互斥，唤起控件立即隐藏细进度');

    const episodes = fixture.querySelector<HTMLButtonElement>(
      '[aria-controls="player-episodes-sheet"], [aria-haspopup="dialog"][aria-label="选集"]',
    );

    episodes?.click();
    await until(() =>
      Boolean(document.querySelector('#player-episodes-sheet')),
    );

    const sheet = document.querySelector('#player-episodes-sheet');
    const titleBar = fixture.querySelector('.desktop-title-bar');

    assert(
      sheet &&
        titleBar &&
        sheet.getBoundingClientRect().top >=
          titleBar.getBoundingClientRect().bottom,
      '选集面板位于系统标题栏下方',
    );
    assert(
      sheet && getComputedStyle(sheet).colorScheme === 'dark',
      '选集面板保持暗色',
    );

    // 可选预览停留，供人工检查普通窗口和全屏选集布局。
    if (new URL(originalUrl).searchParams.has('preview')) {
      await new Promise<void>((resolve) => {
        // 通过外部按钮恢复测试，不往业务组件添加调试入口。
        const finish = document.createElement('button');

        finish.id = 'finish-preview';
        finish.textContent = '完成外观检查';
        finish.addEventListener(
          'click',
          () => {
            finish.remove();
            resolve();
          },
          { once: true },
        );
        document.querySelector('#status')?.after(finish);
      });
    }

    document
      .querySelector<HTMLButtonElement>(
        '#player-episodes-sheet button:last-child',
      )
      ?.click();
    await router.push('/overview');
    await until(() => theme.resolved === 'light');
    assert(
      theme.mode === 'light' && themes.at(-1) === 'light:light',
      '返回主页恢复亮色与原生窗口按钮',
    );
    report('播放器整窗暗色、标题栏避让、文字音量提示及离开后的主题恢复');
  } finally {
    app.unmount();
    useHistoryStore(pinia).$dispose();
    library.$dispose();
    theme.$dispose();
    pendingHistory.forEach((resolve) =>
      resolve(Response.json(emptyHistory(ownerId))),
    );
    window.fetch = originalFetch;
    window.ipc = originalIpc;
    window.history.replaceState(null, '', originalUrl);
    if (fullscreenDescriptor) {
      Object.defineProperty(
        document,
        'fullscreenElement',
        fullscreenDescriptor,
      );
    } else {
      Reflect.deleteProperty(document, 'fullscreenElement');
    }
    keys.forEach((key, index) => {
      const value = previous[index];

      if (value === null) {
        localStorage.removeItem(`ym-video:${key}`);
      } else if (value !== undefined) {
        localStorage.setItem(`ym-video:${key}`, value);
      }
    });
  }
};

// 人工触发，避免测试页面加载时自动修改临时环境。
document.querySelector('#run')?.addEventListener('click', () => {
  run().then(
    () => document.querySelector('#status')?.replaceChildren('全部通过'),
    (cause: unknown) =>
      document
        .querySelector('#status')
        ?.replaceChildren(`失败：${String(cause)}`),
  );
});
