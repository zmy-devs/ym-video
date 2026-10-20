import { createApp, nextTick } from 'vue';
import { createPinia } from 'pinia';
import { emptyHistory } from '@ym-video/history';
import { useLibraryStore } from '../../src/stores/library';
import '../../src/styles/global.css';

// 使用真实根组件、布局及播放器，所有接口留在内存中。
const run = async () => {
  // 测试结束后恢复浏览器环境。
  const originalFetch = window.fetch;
  const originalUrl = window.location.href;
  const originalIpc = Object.getOwnPropertyDescriptor(window, 'ipc');
  let listRequests = 0;
  let ownerId = 'playback-cache-test';

  Object.defineProperty(window, 'ipc', {
    configurable: true,
    value: {
      getVersion: async () => '6.1.0',
      checkForUpdates: async () => false,
      installUpdate: async () => undefined,
      on: () => () => undefined,
    } satisfies NonNullable<Window['ipc']>,
  });

  window.fetch = async (input, options) => {
    // 模拟会话、历史和影片请求，不访问开发数据库。
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      window.location.origin,
    );

    if (url.pathname.startsWith('/api/auth/')) {
      return Response.json({
        user: { id: ownerId, role: 'user', name: '缓存测试' },
        session: { id: 'cache-session' },
      });
    }

    if (url.pathname.startsWith('/api/v1/history')) {
      return Response.json(emptyHistory(ownerId));
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

  library.selected = 'cache-test';
  library.sources = [{ id: 'cache-test', name: '缓存测试源' }];

  const fixture = document.querySelector('#fixture');

  if (!fixture) {
    throw new Error('缺少测试容器');
  }

  const app = createApp(App).use(pinia).use(router);

  app.mount(fixture);

  try {
    await until(() => Boolean(fixture.textContent?.includes('缓存影片60')));
    await until(() => useHistoryStore(pinia).loaded);

    // 等账号初始化及组件更新结束后记录实际节点与请求次数。
    await nextTick();

    const page = fixture.querySelector('.page-content');
    const viewport = fixture.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );

    if (!page || !viewport) {
      throw new Error('首页未完成渲染');
    }

    // 左列预览必须跨过滚动容器边界，实际盖住侧边栏。
    const card = page.querySelector('article');

    card?.dispatchEvent(new PointerEvent('pointerenter'));
    await until(() => {
      const preview = document.querySelector<HTMLElement>(
        '[data-slot="movie-preview"]',
      );
      const sidebar = fixture.querySelector('[data-sidebar="sidebar"]');

      if (!preview || !sidebar) {
        return false;
      }

      const rect = preview.getBoundingClientRect();
      const sidebarRight = sidebar.getBoundingClientRect().right;

      return (
        preview.parentElement === document.body &&
        rect.left < sidebarRight &&
        preview.contains(
          document.elementFromPoint(
            (rect.left + sidebarRight) / 2,
            rect.top + rect.height / 2,
          ),
        )
      );
    });

    // 从卡片移动到独立浮层时保持显示，离开后关闭。
    const preview = document.querySelector('[data-slot="movie-preview"]');

    if (preview instanceof HTMLElement) {
      // 浮层随列表滚动，不能停留在窗口的旧位置。
      const previousTop = Number.parseFloat(preview.style.top);

      viewport.scrollTop = 20;
      await until(
        () => Number.parseFloat(preview.style.top) === previousTop - 20,
      );
      viewport.scrollTop = 0;
      await until(() => Number.parseFloat(preview.style.top) === previousTop);
    }

    card?.dispatchEvent(
      new PointerEvent('pointerleave', { relatedTarget: preview }),
    );
    await nextTick();
    assert(preview?.isConnected, '移动到预览上不能闪退');
    preview?.dispatchEvent(new PointerEvent('pointerleave'));
    await nextTick();
    assert(!preview?.isConnected, '离开预览后应关闭浮层');

    card?.dispatchEvent(new FocusEvent('focusin'));
    await nextTick();
    assert(
      document.querySelector('[data-slot="movie-preview"]'),
      '键盘聚焦也应显示预览',
    );
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    assert(
      !document.querySelector('[data-slot="movie-preview"]'),
      'Escape 应关闭预览',
    );

    viewport.scrollTop = 350;
    assert(viewport.scrollTop === 350, '必须先滚动列表');
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );

    const initialRequests = listRequests;

    for (let turn = 0; turn < 2; turn += 1) {
      // 普通卡片点击必须走 Vue 路由，不能触发 Electron 整页 loadURL。
      const link = fixture.querySelector<HTMLAnchorElement>(
        'a[aria-label="播放 缓存影片1"]',
      );

      assert(link && !link.target, '桌面播放入口不能使用新标签页');
      link?.click();

      await until(() => Boolean(fixture.querySelector('.player-surface')));
      assert(!page.isConnected, '进入播放器应暂存首页节点');
      assert(
        !document.querySelector('[data-slot="movie-preview"]'),
        '缓存首页时必须关闭独立浮层',
      );

      const back = fixture.querySelector<HTMLAnchorElement>(
        'a[aria-label="返回主页"]',
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
    window.fetch = originalFetch;
    window.history.replaceState(null, '', originalUrl);

    if (originalIpc) {
      Object.defineProperty(window, 'ipc', originalIpc);
    } else {
      Reflect.deleteProperty(window, 'ipc');
    }
  }
};

// 等待真实组件更新，超时即报告失败。
const until = async (ready: () => boolean) => {
  const deadline = Date.now() + 8_000;

  while (!ready()) {
    if (Date.now() > deadline) {
      throw new Error('等待页面更新超时');
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

// 结果显示在页面，供浏览器或 Electron 测试读取。
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
