import { mockDesktop } from './desktop-mock';
import { createApp, nextTick } from 'vue';
import { createPinia } from 'pinia';
import { emptyHistory } from '@ym-video/history';
import { useLibraryStore } from '../../src/stores/library-store';
import { useThemeStore } from '../../src/stores/theme-store';
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
  const deadline = Date.now() + 20000;

  while (!check()) {
    if (Date.now() > deadline) {
      throw new Error('等待页面状态超时：' + check.toString());
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

// 使用真实根组件和 Tauri 模拟数据，不访问账号、播放源或远程视频。
const run = async () => {
  // 原始浏览器环境在测试结束后恢复。
  const originalFetch = window.fetch;

  // 模拟原生媒体事件，验证界面状态时使用本机内存数据。
  const originalPlay = HTMLMediaElement.prototype.play;
  const originalPause = HTMLMediaElement.prototype.pause;
  const originalLoad = HTMLMediaElement.prototype.load;

  HTMLMediaElement.prototype.play = function () {
    Object.defineProperty(this, 'paused', { configurable: true, value: false });
    this.dispatchEvent(new Event('play'));
    this.dispatchEvent(new Event('playing'));
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause = function () {
    Object.defineProperty(this, 'paused', { configurable: true, value: true });
    this.dispatchEvent(new Event('pause'));
  };
  HTMLMediaElement.prototype.load = function () {
    this.preload = 'none';
  };

  let restoreDesktop: (() => void) | undefined;

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

  restoreDesktop = mockDesktop({
    theme: (resolved) => {
      themes.push(resolved + ':' + resolved);
    },
    resource: async (address) => {
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
  });

  window.history.replaceState(null, '', '/overview');

  // 安装模拟环境后再创建真实路由与账号客户端。
  const { router } = await import('../../src/router');

  const { default: App } = await import('../../src/App.vue');

  const { useHistoryStore } = await import('../../src/stores/history-store');

  const pinia = createPinia();

  const library = useLibraryStore(pinia);

  const theme = useThemeStore(pinia);

  library.selected = 'baofeng';

  library.platformSources = [
    { id: 'baofeng', name: '初始源' },
    { id: 'recovery', name: '恢复源', url: 'https://recovery.example/api' },
  ];

  // 使用与生产窗口一致的完整视口，验证固定弹层与标题栏的相对位置。
  const fixture = document.querySelector<HTMLElement>('#fixture');

  if (!fixture) {
    throw new Error('缺少测试容器');
  }

  const originalFixtureStyle = fixture.getAttribute('style');

  fixture.style.cssText = 'position: fixed; inset: 0; height: 100dvh';

  const app = createApp(App).use(pinia).use(router);

  app.mount(fixture);

  try {
    const categories = library.loadCategories();

    await until(() => calls.has('initial:detail'));

    assert(
      fixture.querySelector('[data-slot="movie-grid-skeleton"]'),
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
      fixture.querySelector('[data-slot="movie-grid-skeleton"]'),
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

    // 标题栏中的侧栏开关位于内容区左端。
    const homeTitleBar = fixture.querySelector(
      '[data-slot="sidebar-inset"] > .desktop-title-bar',
    );

    assert(
      homeTitleBar &&
        Number.parseFloat(getComputedStyle(homeTitleBar).borderBottomWidth) > 0,
      '主页标题栏有底边框',
    );

    // 开关位于侧栏分隔线右侧，侧栏内容采用共享滚动组件。
    const sidebar = fixture.querySelector('[data-sidebar="sidebar"]');

    // 用实际元素边界检查开关与侧栏分隔线的相对位置。
    const sidebarTrigger = homeTitleBar?.querySelector(
      '[data-sidebar="trigger"]',
    );

    assert(
      sidebar &&
        sidebarTrigger &&
        sidebarTrigger.getBoundingClientRect().left >=
          sidebar.getBoundingClientRect().right &&
        sidebar.querySelector('[data-slot="scroll-area-viewport"]'),
      '侧栏开关位于标题栏左侧，侧栏使用 ScrollArea',
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
      themes.at(-1) === 'dark:dark',
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

    if (video) {
      Object.defineProperty(video, 'duration', {
        configurable: true,
        value: 100,
      });
      video.dispatchEvent(new Event('loadedmetadata'));
    }

    const controls =
      fixture.querySelector('.player-label')?.parentElement?.parentElement;

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: surface,
    });

    document.dispatchEvent(new Event('fullscreenchange'));

    video?.dispatchEvent(new Event('play'));

    surface?.dispatchEvent(new PointerEvent('pointerleave'));

    await until(() => Boolean(fixture.querySelector('.player-mini-progress')));

    assert(
      controls && getComputedStyle(controls).display === 'none',
      '收起控制栏后才显示底部细进度',
    );

    // 控件收起后仍有完整进度轨道，零进度也不能整条消失。
    const miniProgress = fixture.querySelector<HTMLElement>(
      '.player-mini-progress',
    );

    assert(
      miniProgress &&
        surface &&
        miniProgress.getBoundingClientRect().width ===
          surface.getBoundingClientRect().width &&
        miniProgress.getBoundingClientRect().height === 3 &&
        miniProgress.getBoundingClientRect().bottom ===
          surface.getBoundingClientRect().bottom,
      '全屏细进度覆盖播放器底边',
    );

    assert(
      video &&
        miniProgress &&
        video.getBoundingClientRect().bottom <=
          miniProgress.getBoundingClientRect().top,
      '视频与底部细进度各占独立区域，不依赖缓冲浮层遮挡视频',
    );

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );

    await until(() => fixture.textContent?.includes('音量：40%') === true);

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );

    await until(() => fixture.textContent?.includes('3 倍速播放中…') === true);

    assert(
      video?.playbackRate === 3 &&
        controls &&
        getComputedStyle(controls).display === 'none' &&
        miniProgress?.isConnected,
      '长按提示优先于音量提示，且不唤出控制栏或隐藏细进度',
    );

    window.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }),
    );

    await until(() => !fixture.textContent?.includes('倍速播放中…'));

    assert(video?.playbackRate === 1, '松开右方向键立即恢复原倍速');

    video?.dispatchEvent(new Event('waiting'));

    await nextTick();

    assert(miniProgress?.isConnected, '缓冲时仍保留同一条底部细进度');

    video?.dispatchEvent(new Event('playing'));

    await nextTick();

    assert(
      miniProgress?.isConnected &&
        !surface?.querySelector('[data-slot="player-loading"]') &&
        video &&
        video.getBoundingClientRect().bottom <=
          miniProgress.getBoundingClientRect().top,
      '加载提示消失后，细进度仍独占底边且不与视频重叠',
    );

    surface?.dispatchEvent(new PointerEvent('pointermove'));

    await nextTick();

    assert(
      controls &&
        getComputedStyle(controls).display !== 'none' &&
        !fixture.querySelector('.player-mini-progress'),
      '唤起完整控件后细进度立即隐藏',
    );

    video?.dispatchEvent(new Event('pause'));

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });

    document.dispatchEvent(new Event('fullscreenchange'));

    await nextTick();

    report('全屏细进度持续显示，音量与长按倍速有提示，松开恢复原倍速');

    const episodes = fixture.querySelector<HTMLButtonElement>(
      'button[aria-label="选集"]',
    );

    episodes?.click();

    await until(() =>
      Boolean(document.querySelector('[data-slot="sheet-content"]')),
    );

    const sheet = document.querySelector('[data-slot="sheet-content"]');

    const titleBar = fixture.querySelector('.desktop-title-bar');

    assert(
      sheet &&
        titleBar &&
        sheet.getBoundingClientRect().top >=
          titleBar.getBoundingClientRect().bottom,
      '选集面板位于系统标题栏下方',
    );

    assert(
      sheet && fixture.querySelector('.player-page.dark'),
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
        '[data-slot="sheet-content"] button:last-child',
      )
      ?.click();

    fixture
      .querySelector<HTMLButtonElement>('button[aria-label="返回"]')
      ?.click();

    await until(() => router.currentRoute.value.path === '/overview');

    await until(() => theme.resolved === 'light');

    assert(
      theme.mode === 'light' && themes.at(-1) === 'light:light',
      '返回主页恢复亮色与原生窗口按钮',
    );

    report('播放器整窗暗色、标题栏避让、文字音量提示及离开后的主题恢复');

    theme.setMode('dark');

    await until(() => themes.at(-1) === 'dark:dark');

    theme.setMode('auto');

    await until(() => themes.at(-1) === 'null:null');

    assert(
      theme.resolved ===
        (window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'),
      '自动模式使用系统明暗主题',
    );

    await router.push('/search?q=返回测试');

    await router.push('/player/baofeng/movie');

    await until(() => Boolean(fixture.querySelector('video')));

    fixture
      .querySelector<HTMLButtonElement>('button[aria-label="返回"]')
      ?.click();

    await until(() => router.currentRoute.value.path === '/search');

    assert(
      router.currentRoute.value.query.q === '返回测试' &&
        themes.at(-1) === 'null:null',
      '返回搜索结果保留关键词，离开播放器恢复跟随系统',
    );

    report('播放器返回进入前页面，自动主题恢复系统控制');
  } finally {
    app.unmount();

    fixture.setAttribute('style', originalFixtureStyle ?? '');

    useHistoryStore(pinia).$dispose();

    library.$dispose();

    theme.$dispose();

    pendingHistory.forEach((resolve) =>
      resolve(Response.json(emptyHistory(ownerId))),
    );

    window.fetch = originalFetch;

    HTMLMediaElement.prototype.play = originalPlay;
    HTMLMediaElement.prototype.pause = originalPause;
    HTMLMediaElement.prototype.load = originalLoad;

    restoreDesktop?.();

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
