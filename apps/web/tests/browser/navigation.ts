import { createApp, h, nextTick } from 'vue';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import AppLayout from '../../src/layout/index.vue';
import Catalogue from '../../src/views/catalogue.vue';
import History from '../../src/views/history.vue';
import AppDialogs from '../../src/components/dialogs/index.vue';
import { useLibraryStore } from '../../src/stores/library-store';
import '../../src/styles/global.css';

// 真实组件只访问此测试页的模拟接口，不读写开发数据库。
const run = async () => {
  // 保存每次请求，检查切页不会从旧页面发起多余查询。
  const requests: URL[] = [];

  const originalFetch = window.fetch;
  // 搜索记录只用于本轮测试，结束后恢复浏览器原值。
  const previousSearches = localStorage.getItem('ym-video:searches');

  localStorage.setItem('ym-video:searches', JSON.stringify(['测试搜索记录']));

  const pinia = createPinia();
  const library = useLibraryStore(pinia);
  library.selected = 'navigation-test';
  library.platformSources = [{ id: 'navigation-test', name: '导航测试源' }];
  library.categories = [{ id: 1, parentId: 0, name: '测试分类' }];

  // 挂起新页数据，验证等待期间不会把旧列表改成新标题。
  let release: (() => void) | undefined;
  let hold: Promise<void> | undefined;
  window.fetch = async (input, options) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      window.location.origin,
    );
    if (!url.pathname.startsWith('/api/v1/proxy/')) {
      return Response.json(null);
    }
    requests.push(url);
    if (hold) {
      await hold;
    }

    return Response.json({
      list: Array.from({ length: 30 }, (_, index) => ({
        vod_id: index,
        vod_name: `${url.searchParams.get('wd') || url.searchParams.get('t') || '概览'}影片${index}`,
      })),
      pagecount: 1,
    });
  };

  // 使用生产布局和共用列表页，只省略与页面生命周期无关的鉴权。
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        meta: { sidebar: true },
        children: [
          {
            path: 'overview',
            component: Catalogue,
            meta: { keepAlive: true },
          },
          { path: 'category/:id', component: Catalogue },
          { path: 'search', component: Catalogue },
          { path: 'history', component: History },
        ],
      },
    ],
  });
  await router.push('/overview');
  const fixture = document.querySelector<HTMLElement>('#fixture');
  if (!fixture) {
    throw new Error('测试容器不存在');
  }
  fixture.style.height = '100vh';
  fixture.style.overflow = 'hidden';
  const app = createApp({ render: () => [h(AppLayout), h(AppDialogs)] })
    .use(pinia)
    .use(router);
  app.mount(fixture);

  try {
    await until(() => Boolean(fixture.textContent?.includes('概览影片29')));
    const sidebar = fixture.querySelector('[data-slot="sidebar"]');
    const previousPage = fixture.querySelector('[data-slot="catalogue-page"]');

    // 页面滚动区域独立于侧栏的 ScrollArea。
    const previousViewport = previousPage?.closest<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!previousPage || !previousViewport) {
      throw new Error('概览页未就绪');
    }

    // 加载覆盖整个视口，结束后保留当前列表实例。
    library.status = 'loading';
    await nextTick();
    const loading = fixture.querySelector<HTMLElement>(
      '[data-slot="loading-overlay"]',
    );
    const bounds = loading?.getBoundingClientRect();
    assert(
      loading &&
        getComputedStyle(loading).position === 'fixed' &&
        bounds?.top === 0 &&
        bounds.left === 0 &&
        bounds.width === document.documentElement.clientWidth &&
        bounds.height === document.documentElement.clientHeight,
      '加载层应固定覆盖整个视口',
    );
    assert(
      loading?.querySelector('[data-slot="spinner"]'),
      '加载层通过 Overlay 插槽显示 Spinner',
    );

    // 模拟全屏宿主，检查覆盖层会进入全屏容器并在退出后归位。
    const fullscreenHost = document.createElement('div');
    const fullscreenDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'fullscreenElement',
    );
    document.body.append(fullscreenHost);
    try {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: fullscreenHost,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
      await nextTick();
      assert(
        fullscreenHost.querySelector('[data-slot="loading-overlay"]') ===
          loading,
        '视频全屏时覆盖层应进入全屏宿主',
      );
    } finally {
      if (fullscreenDescriptor) {
        Object.defineProperty(
          document,
          'fullscreenElement',
          fullscreenDescriptor,
        );
      } else {
        Reflect.deleteProperty(document, 'fullscreenElement');
      }
      document.dispatchEvent(new Event('fullscreenchange'));
      await nextTick();
      fullscreenHost.remove();
    }
    assert(
      fixture.querySelector('[data-slot="loading-overlay"]') === loading,
      '退出全屏后覆盖层应归位',
    );
    library.status = 'ready';
    await nextTick();
    assert(
      !fixture.querySelector('[data-slot="loading-overlay"]') &&
        previousPage.isConnected,
      '加载结束保留原页面',
    );
    report('全屏加载层覆盖视口，结束后保留页面');

    // 断网只展示覆盖层，恢复网络后继续使用原来的页面和侧栏。
    window.dispatchEvent(new Event('offline'));
    await nextTick();
    const offline = fixture.querySelector('[data-slot="offline-overlay"]');
    assert(
      offline?.querySelector('[data-slot="empty"]') &&
        offline.textContent?.includes('网络已断开'),
      '断网层使用 Empty 展示网络提示',
    );
    assert(
      document
        .elementFromPoint(innerWidth / 2, innerHeight / 2)
        ?.closest('[data-slot="offline-overlay"]'),
      '断网层应覆盖页面交互区域',
    );
    window.dispatchEvent(new Event('online'));
    await nextTick();
    assert(
      !fixture.querySelector('[data-slot="offline-overlay"]') &&
        previousPage.isConnected &&
        sidebar === fixture.querySelector('[data-slot="sidebar"]'),
      '联网后自动关闭覆盖层并保留页面实例',
    );
    report('断网 Empty 覆盖界面，联网后恢复原页面');

    const categoryToggle = [
      ...fixture.querySelectorAll<HTMLElement>(
        '[data-slot="sidebar-group-label"] button',
      ),
    ].find((item) => item.textContent?.trim() === '分类');
    categoryToggle?.click();
    await nextTick();
    const categoryMenu = fixture.querySelector<HTMLElement>('#category-menu');
    assert(categoryMenu?.style.display === 'none', '分类分组应支持折叠');
    categoryToggle?.click();
    await nextTick();
    assert(categoryMenu?.style.display !== 'none', '分类分组应支持展开');
    const trigger = fixture.querySelector<HTMLElement>(
      '[data-sidebar="trigger"]',
    );
    trigger?.click();
    await nextTick();
    assert(
      sidebar?.getAttribute('data-state') === 'collapsed',
      `封装后的侧栏应支持收起，按钮 ${Boolean(trigger)}，实际状态 ${sidebar?.getAttribute('data-state')}`,
    );
    trigger?.click();
    await nextTick();
    assert(
      sidebar?.getAttribute('data-state') === 'expanded',
      '封装后的侧栏应支持展开',
    );
    report('共享侧栏和分类分组保持收缩交互');
    const previousText = previousPage.textContent;
    previousViewport.scrollTop = 300;
    assert(previousViewport.scrollTop > 0, '测试必须先滚动旧页面');
    hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    await router.push('/category/1');
    await nextTick();
    assert(!previousPage.isConnected, '切换分类应暂存概览，不能原地修改概览');
    assert(
      previousPage.textContent === previousText,
      '缓存的概览不能变成其他页面标题',
    );
    // 新路由使用自己的内容滚动区域。
    const currentViewport = fixture
      .querySelector('[data-slot="catalogue-page"]')
      ?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');
    assert(currentViewport !== previousViewport, '新页面应有独立滚动区域');
    assert(currentViewport?.scrollTop === 0, '新页面应从顶部展示');
    assert(
      fixture.querySelector('[data-slot="movie-grid-skeleton"]'),
      '新页等待数据时展示加载状态',
    );
    assert(
      sidebar === fixture.querySelector('[data-slot="sidebar"]'),
      '切页应保留侧栏实例',
    );
    report('概览切分类：旧页不变形，新页滚动归零，侧栏保留');
    release?.();
    hold = undefined;
    await until(() => Boolean(fixture.textContent?.includes('1影片29')));

    await router.push('/search?q=alpha');
    await until(() => Boolean(fixture.textContent?.includes('alpha影片29')));
    const previousSearch = fixture.querySelector(
      '[data-slot="catalogue-page"]',
    );
    await router.push('/search?q=beta');
    await until(() => Boolean(fixture.textContent?.includes('beta影片29')));
    assert(!previousSearch?.isConnected, '切换搜索词不能沿用上一个结果页实例');
    assert(
      previousSearch?.textContent?.includes('“alpha”'),
      '旧搜索页标题应保留原词',
    );
    report('搜索词切换：页面和列表不混用上一轮状态');

    const beforeLeave = requests.length;
    await router.push('/history');
    await nextTick();
    assert(fixture.textContent?.includes('观看历史'), '应进入观看历史');
    assert(
      requests.length === beforeLeave,
      '离开列表后不能按历史路由重新请求影片',
    );
    report('离开列表：不发送失效影片请求');

    // 返回概览复用页面实例，保留最近更新列表。
    await router.push('/overview');
    await until(() => Boolean(fixture.textContent?.includes('概览影片29')));
    assert(requests.length === beforeLeave, '返回概览不能重复请求最近更新');
    assert(
      fixture.querySelector('[data-slot="catalogue-page"]') === previousPage,
      '返回概览应复用原页面实例',
    );
    report('概览页面缓存：复用原页面，不重复请求最近更新');

    document.getElementById('search-trigger')?.click();
    await until(() => Boolean(document.getElementById('search-keyword')));

    [...document.querySelectorAll<HTMLElement>('[data-slot="command-item"]')]
      .find((item) => item.textContent?.includes('清空搜索历史'))
      ?.click();
    await until(() =>
      Boolean(document.querySelector('[data-slot="alert-dialog-content"]')),
    );
    [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[data-slot="alert-dialog-content"] button',
      ),
    ]
      .find((button) => button.textContent === '取消')
      ?.click();
    await until(
      () => !document.querySelector('[data-slot="alert-dialog-content"]'),
    );
    assert(
      document
        .querySelector('[data-slot="dialog-content"]')
        ?.textContent?.includes('测试搜索记录'),
      '取消确认后保留搜索记录和弹窗',
    );
    [...document.querySelectorAll<HTMLElement>('[data-slot="command-item"]')]
      .find((item) => item.textContent?.includes('清空搜索历史'))
      ?.click();
    await until(() =>
      Boolean(document.querySelector('[data-slot="alert-dialog-content"]')),
    );
    document
      .querySelector<HTMLElement>(
        '[data-slot="alert-dialog-content"] [data-variant="destructive"]',
      )
      ?.click();
    await until(
      () => !document.querySelector('[data-slot="alert-dialog-content"]'),
    );
    assert(
      localStorage.getItem('ym-video:searches') === '[]' &&
        Boolean(document.querySelector('[data-slot="dialog-content"]')),
      '确认清空只删除记录，保留搜索弹窗',
    );
    fill('search-keyword', '测试片名');
    await nextTick();
    [...document.querySelectorAll<HTMLElement>('[data-slot="command-item"]')]
      .find((item) => item.textContent?.includes('搜索“测试片名”'))
      ?.click();
    await until(
      () =>
        router.currentRoute.value.query.q === '测试片名' &&
        !document.querySelector('[data-slot="dialog-content"]'),
    );
    report('根搜索弹窗支持叠加确认、取消、清空和搜索跳转');
  } finally {
    release?.();
    app.unmount();
    library.$dispose();
    window.fetch = originalFetch;
    if (previousSearches === null) {
      localStorage.removeItem('ym-video:searches');
    } else {
      localStorage.setItem('ym-video:searches', previousSearches);
    }
  }
};

// 使用原生输入事件同步真实组件的 v-model。
const fill = (id: string, value: string) => {
  const input = document.getElementById(id);

  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`缺少字段：${id}`);
  }

  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

// 等待实际组件和模拟接口完成，不依赖固定加载速度。
const until = async (ready: () => boolean) => {
  const deadline = Date.now() + 5000;
  while (!ready()) {
    if (Date.now() > deadline) {
      throw new Error('等待页面超时：' + ready.toString());
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

// 失败直接停止，避免把后续步骤误报为通过。
const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

// 每个场景的结果直接显示在测试页面。
const report = (message: string) => {
  const item = document.createElement('li');
  item.textContent = `通过：${message}`;
  document.querySelector('#results')?.append(item);
};

// 测试只在人工点击时运行，便于先验证失败再复查修复。
document
  .querySelector<HTMLButtonElement>('#run')
  ?.addEventListener('click', (event) => {
    const button = event.currentTarget;
    if (button instanceof HTMLButtonElement) {
      button.disabled = true;
    }
    run().then(
      () => {
        const status = document.querySelector('#status');
        if (status) {
          status.textContent = `全部通过（${document.querySelectorAll('#results li').length} 个场景）`;
        }
      },
      (cause: unknown) => {
        const status = document.querySelector('#status');
        if (status) {
          status.textContent = `失败：${cause instanceof Error ? cause.message : String(cause)}`;
        }
      },
    );
  });
