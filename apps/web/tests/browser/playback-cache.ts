import { mockDesktop } from './desktop-mock';
import { createApp, nextTick } from 'vue';
import { createPinia } from 'pinia';
import { emptyHistory } from '@ym-video/history';
import { useLibraryStore } from '../../src/stores/library';
import { movieKey } from '../../src/lib/movie';
import '../../src/styles/global.css';

// 使用真实根组件、布局及播放器，所有接口留在内存中。
const run = async () => {
  // 测试结束后恢复浏览器环境。
  const originalFetch = window.fetch;

  const originalUrl = window.location.href;

  let listRequests = 0;

  let ownerId = 'playback-cache-test';

  const pendingHistory: Array<(response: Response) => void> = [];

  let accountUnavailable = false;

  let sessionRequests = 0;

  const restoreDesktop = mockDesktop({
    resource: async (address) => {
      const response = await window.fetch(
        '/api/v1/proxy/cache-test?' + new URL(address).searchParams,
      );

      return response.json();
    },
  });

  window.fetch = async (input, options) => {
    // 模拟会话、历史和影片请求，不访问开发数据库。
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      window.location.origin,
    );

    if (url.pathname.startsWith('/api/auth/')) {
      sessionRequests += 1;

      if (accountUnavailable) {
        throw new TypeError('测试账号服务不可用');
      }

      return Response.json({
        user: { id: ownerId, role: 'user', name: '缓存测试' },
        session: { id: 'cache-session' },
      });
    }

    if (url.pathname.startsWith('/api/v1/history')) {
      return new Promise<Response>((resolve) => pendingHistory.push(resolve));
    }

    if (url.pathname.startsWith('/api/v1/proxy/')) {
      if (url.searchParams.has('ids')) {
        // 无可播地址即可展示真实播放器错误页，无需下载媒体。
        return Response.json({ list: [], pagecount: 1 });
      }

      listRequests += 1;

      return Response.json({
        list: Array.from({ length: 60 }, (_, index) => ({
          vod_id: index + 1,
          vod_name: `缓存影片${index + 1}`,
        })),
        pagecount: 1,
      });
    }

    return originalFetch(input, options);
  };

  window.history.replaceState(null, '', '/overview');

  // Better Auth 初始化时捕获模拟 fetch。
  const { router } = await import('../../src/router');

  const { default: App } = await import('../../src/App.vue');

  const { useHistoryStore } = await import('../../src/stores/history');

  const pinia = createPinia();

  const library = useLibraryStore(pinia);

  library.selected = 'baofeng';

  library.sources = [{ id: 'baofeng', name: '缓存测试源' }];

  const fixture = document.querySelector('#fixture');

  if (!fixture) {
    throw new Error('缺少测试容器');
  }

  const app = createApp(App).use(pinia).use(router);

  app.mount(fixture);

  try {
    await until(() => Boolean(fixture.textContent?.includes('缓存影片60')));

    await until(() => useHistoryStore(pinia).loaded);

    // 先建立本机观看记录，后台云端读取继续保持挂起。
    const history = useHistoryStore(pinia);

    // 与生产播放器使用相同的影片复合标识。
    const id = movieKey('baofeng', '1');

    await history.save(
      {
        id,
        sourceId: 'baofeng',
        vodId: '1',
        name: '缓存影片1',
        pic: '',
        year: '',
        area: '',
        lang: '',
        category: '',
        remarks: '',
        episodes: [{ label: '第 1 集', url: 'https://media.example/1.mp4' }],
        episode: 0,
        progress: { '0': { currentTime: 12, duration: 100 } },
        watchedAt: Date.now(),
      },
      history.token(id),
    );

    // 等账号初始化及组件更新结束后记录实际节点与请求次数。
    await nextTick();

    const page = fixture.querySelector('.page-content');

    // 保存列表的滚动容器，用于验证返回后的位置恢复。
    const viewport = fixture
      .querySelector('.page-content')
      ?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');

    if (!page || !viewport) {
      throw new Error('首页未完成渲染');
    }

    // 键盘聚焦与鼠标悬停使用相同的整卡缩放。
    const card = page.querySelector('article');

    card?.querySelector('a')?.focus({ preventScroll: true });

    await until(() => Boolean(card && getComputedStyle(card).scale === '1.1'));

    await router.push('/history');

    await nextTick();

    // 历史页面按日期展示分组，副标题末尾显示所属播放源。
    const historyCard = fixture.querySelector<HTMLElement>(
      '.movie-grid article',
    );

    if (!historyCard) {
      throw new Error('观看历史卡片未完成渲染');
    }

    assert(
      historyCard.closest('section')?.querySelector('h2')?.textContent ===
        '今日' &&
        historyCard
          .querySelector('p')
          ?.textContent?.trim()
          .endsWith('缓存测试源'),
      '历史卡片应归入今日并展示所属播放源',
    );

    for (let turn = 0; turn < 2; turn += 1) {
      // 等聚焦缩放完成后，在卡片内部打开菜单。
      historyCard.querySelector('a')?.focus({ preventScroll: true });

      await until(() => getComputedStyle(historyCard).scale === '1.1');

      const rect = historyCard.getBoundingClientRect();

      const x = rect.left + rect.width / 3;

      const y = rect.top + rect.height / 3;

      historyCard.dispatchEvent(
        new MouseEvent('contextmenu', {
          clientX: x,
          clientY: y,
          button: 2,
          bubbles: true,
          cancelable: true,
        }),
      );

      await until(() => Boolean(document.querySelector('[role="menu"]')));

      const menu = document.querySelector<HTMLElement>('[role="menu"]');

      if (!menu) {
        throw new Error('历史右键菜单未显示');
      }

      await Promise.all(
        menu.getAnimations().map((animation) => animation.finished),
      );

      assert(
        Math.abs(menu.getBoundingClientRect().left - x - 2) < 1 &&
          Math.abs(menu.getBoundingClientRect().top - y) < 1,
        '历史菜单必须显示在右键位置',
      );

      menu.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );

      await until(() => !document.querySelector('[role="menu"]'));
    }

    await router.push('/overview');

    await nextTick();

    viewport.scrollTop = 350;

    assert(viewport.scrollTop === 350, '必须先滚动列表');

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );

    const initialRequests = listRequests;

    const initialSessionRequests = sessionRequests;

    accountUnavailable = true;

    for (let turn = 0; turn < 2; turn += 1) {
      // 点击真实卡片进入当前窗口，覆盖入口行为与登录会话复用。
      const link = fixture.querySelector<HTMLAnchorElement>(
        'a[aria-label="播放 缓存影片1"]',
      );

      assert(link && !link.target, '播放入口应使用当前窗口内的路由');

      link?.click();

      await until(() => Boolean(fixture.querySelector('.player-surface')));

      await until(() => Boolean(fixture.textContent?.includes('影片不存在')));

      assert(
        sessionRequests === initialSessionRequests,
        '账号服务不可用时，打开影片不能再请求会话',
      );

      assert(pendingHistory.length > 0, '必须在历史接口仍挂起时完成影片加载');

      assert(!page.isConnected, '进入播放器应暂存首页节点');

      assert(listRequests === initialRequests, '打开影片不能重新请求首页列表');

      const back = fixture.querySelector<HTMLButtonElement>(
        'button[aria-label="返回"]',
      );

      back?.click();

      await until(() => page.isConnected);

      await nextTick();

      assert(
        fixture.querySelector('.page-content') === page,
        '返回时必须复用同一个首页节点',
      );

      assert(viewport.scrollTop === 350, '返回时必须保留滚动位置');

      assert(listRequests === initialRequests, '返回时不能重新请求首页列表');

      assert(!fixture.querySelector('video'), '离开播放器必须释放媒体组件');
    }

    // 账号切换必须销毁旧缓存，避免沿用上一账号的页面状态。
    ownerId = 'playback-cache-next';

    await useHistoryStore(pinia).setAccount(ownerId);

    await until(
      () =>
        Boolean(fixture.querySelector('.page-content')) && !page.isConnected,
    );

    assert(listRequests > initialRequests, '新账号应重新创建首页');
  } finally {
    app.unmount();

    useHistoryStore(pinia).$dispose();

    library.$dispose();

    pendingHistory.forEach((resolve) =>
      resolve(Response.json(emptyHistory(ownerId))),
    );

    window.fetch = originalFetch;

    window.history.replaceState(null, '', originalUrl);

    restoreDesktop();
  }
};

// 等待真实组件更新，超时即报告失败。
const until = async (ready: () => boolean) => {
  const deadline = Date.now() + 8000;

  while (!ready()) {
    if (Date.now() > deadline) {
      throw new Error('等待页面更新超时：' + ready.toString());
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

// 断言失败后中止后续验证。
const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

// 结果显示在页面，供浏览器或 Tauri 测试读取。
document.querySelector('#run')?.addEventListener('click', () => {
  run().then(
    () => {
      document.querySelector('#status')?.replaceChildren('全部通过');
    },
    (cause: unknown) => {
      document
        .querySelector('#status')
        ?.replaceChildren(
          `失败：${cause instanceof Error ? cause.message : String(cause)}`,
        );
    },
  );
});
