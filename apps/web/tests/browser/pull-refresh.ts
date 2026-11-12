import { createApp, h, KeepAlive, nextTick, type VNode } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import {
  createMemoryHistory,
  createRouter,
  RouterView,
  type RouteLocationNormalizedLoaded,
} from 'vue-router';
import CataloguePage from '../../src/views/catalogue.vue';
import HistoryPage from '../../src/views/history.vue';
import MobileHeader from '../../src/components/mobile-header.vue';
import { useLibraryStore } from '../../src/stores/library-store';
import { useHistoryStore } from '../../src/stores/history-store';
import '../../src/styles/global.css';

// 每个断言保留具体触摸场景，便于浏览器回归定位。
const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

// 等待真实组件请求和 Vue 更新，包含现有请求重试的等待时间。
const until = async (check: () => boolean) => {
  await nextTick();

  // 网络连续失败的重试最多需要十五秒。
  const deadline = Date.now() + 25000;

  while (!check()) {
    assert(Date.now() < deadline, '等待下拉刷新状态超时');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  await nextTick();
};

// 通过浏览器 TouchEvent 驱动组件实际监听器。
const touch = (
  target: Element,
  type: string,
  points: Array<[number, number]>,
) => {
  // 每个触点使用浏览器原生对象，覆盖多指取消。
  const touches = points.map(
    ([clientX, clientY], identifier) =>
      new Touch({ identifier, target, clientX, clientY }),
  );

  // 返回事件以验证横向滑动和普通滚动没有被拦截。
  const event = new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches,
    targetTouches: touches,
  });

  target.dispatchEvent(event);

  return event;
};

// 以固定起点模拟一次下拉，默认超过触发阈值。
const pull = (target: Element, distance = 160) => {
  touch(target, 'touchstart', [[180, 160]]);
  touch(target, 'touchmove', [[180, 160 + distance]]);
  touch(target, 'touchend', []);
};

// 真实目录、分类和历史页共享隔离的源数据与账号状态。
const run = async () => {
  localStorage.clear();

  // 资源响应可暂停，用于检查刷新期间旧内容和加载圆球。
  const requests: URL[] = [];
  let version = 0;
  let failMovies = false;
  let holdMovies = false;
  let finishMovie = () => {};

  // 只替换资源传输边界，影片解析、分页和渲染使用实际代码。
  window.fetch = async (input) => {
    // 开发模式资源代理包含真实的上游查询条件。
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      window.location.origin,
    );
    const target = new URL(url.searchParams.get('url') ?? url.href);

    requests.push(target);

    if (holdMovies) {
      await new Promise<void>((resolve) => {
        finishMovie = resolve;
      });
    }

    return new Response(
      JSON.stringify({
        pagecount: 3,
        list: Array.from({ length: 20 }, (_, index) => ({
          vod_id: `${version}-${index}`,
          vod_name: `影片 ${version}-${index}`,
          vod_year: '2026',
          type_name: '电影',
        })),
      }),
      { status: failMovies ? 503 : 200 },
    );
  };

  // 初始化实际 Pinia 模块，避免测试访问外部账号或资源接口。
  const pinia = createPinia();
  setActivePinia(pinia);

  // 刷新始终保留当前播放源和所选子分类。
  const library = useLibraryStore();
  library.platformSources = [
    { id: 'refresh-test', name: '测试源', url: 'https://source.example/api' },
  ];
  library.selected = 'refresh-test';
  library.categories = [
    { id: 1, parentId: 0, name: '电影' },
    { id: 11, parentId: 1, name: '动作片' },
    { id: 12, parentId: 1, name: '喜剧片' },
  ];
  library.status = 'ready';
  library.categoryStatus = 'ready';

  // 历史页沿用现有同步入口，并能停留在加载状态。
  const history = useHistoryStore();
  history.loaded = true;
  let historyRequests = 0;
  let holdHistory = false;
  let finishHistory = () => {};

  history.refresh = async () => {
    historyRequests += 1;

    if (holdHistory) {
      await new Promise<void>((resolve) => {
        finishHistory = resolve;
      });
    }
  };

  // 路由切换沿用实际页面的 KeepAlive 生命周期。
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/overview', component: CataloguePage },
      { path: '/category/:id', component: CataloguePage },
      { path: '/history', component: HistoryPage },
    ],
  });

  await router.push('/overview');

  // 标题叠放和内容高度与移动端页面壳保持一致。
  const app = createApp({
    setup: () => () =>
      h('div', { class: 'mobile-shell flex h-svh flex-col overflow-hidden' }, [
        h(MobileHeader, { scrolled: false }, () =>
          h('h1', { class: 'text-3xl font-semibold' }, '概览'),
        ),
        h('main', { class: 'min-h-0 flex-1' }, [
          h(RouterView, null, {
            default: ({
              Component,
              route,
            }: {
              Component: VNode;
              route: RouteLocationNormalizedLoaded;
            }) => h(KeepAlive, null, [h(Component, { key: route.path })]),
          }),
        ]),
      ]),
  });

  app.use(pinia);
  app.use(router);
  app.mount('#fixture');

  await until(() => Boolean(document.querySelector('article')));

  // 当前显示的目录使用 ScrollArea 实际视口。
  const viewport = document.querySelector<HTMLElement>(
    '[data-slot="scroll-area-viewport"]',
  );

  assert(viewport, '概览具有实际滚动视口');

  if (!viewport) {
    return;
  }

  // 圆球和状态仅从当前显示页面读取。
  const indicator = () =>
    document.querySelector<HTMLElement>('[data-slot="pull-refresh-indicator"]');
  const refreshing = () =>
    Boolean(
      document.querySelector('[data-slot="pull-refresh"][data-refreshing]'),
    );

  assert(indicator()?.style.opacity === '0', '静止时隐藏圆球');
  pull(viewport, 40);
  await nextTick();
  assert(requests.length === 1, '轻拉回弹不发请求');
  assert(indicator()?.style.opacity === '0', '轻拉后圆球收起');

  viewport.scrollTop = 100;
  pull(viewport);
  assert(requests.length === 1, '列表未到顶部时正常滚动');
  viewport.scrollTop = 0;

  touch(viewport, 'touchstart', [[180, 160]]);
  // 横向滑动锁定后，即使继续斜向移动也不抢占分类手势。
  const horizontal = touch(viewport, 'touchmove', [[260, 170]]);
  touch(viewport, 'touchmove', [[260, 340]]);
  touch(viewport, 'touchend', []);
  assert(!horizontal.defaultPrevented, '横向滑动不被拦截');
  assert(requests.length === 1, '横向滑动不触发刷新');

  touch(viewport, 'touchstart', [[180, 160]]);
  touch(viewport, 'touchmove', [[180, 340]]);
  touch(viewport, 'touchcancel', []);
  await nextTick();
  assert(requests.length === 1, '系统取消手势不触发刷新');

  touch(viewport, 'touchstart', [[180, 160]]);
  touch(viewport, 'touchmove', [[180, 340]]);
  touch(viewport, 'touchstart', [
    [180, 340],
    [240, 340],
  ]);
  touch(viewport, 'touchend', []);
  assert(requests.length === 1, '多指触摸取消当前下拉');

  holdMovies = true;
  version = 1;
  pull(viewport);
  await until(refreshing);
  assert(indicator()?.style.opacity === '1', '加载时圆球保持显示');
  assert(document.body.textContent?.includes('影片 0-0'), '刷新期间保留旧列表');
  assert(
    requests.length === 2 && historyRequests === 1,
    '概览同时刷新影片和历史',
  );

  pull(viewport);
  touch(viewport, 'touchcancel', []);
  await nextTick();
  assert(requests.length === 2, '刷新中重复下拉合并为一次请求');
  assert(indicator()?.style.opacity === '1', '刷新中取消其他触摸不收起圆球');

  holdMovies = false;
  finishMovie();
  await until(() => !refreshing());
  assert(
    document.body.textContent?.includes('影片 1-0'),
    '成功后替换为最新列表',
  );
  assert(
    !document.body.textContent?.includes('影片 0-0'),
    '第一页替换旧分页内容',
  );

  await router.push('/category/12');
  await until(() => requests.some((url) => url.searchParams.get('t') === '12'));
  pull(
    document.querySelector('[data-slot="scroll-area-viewport"]') ?? viewport,
  );
  await until(() => !refreshing());
  assert(
    requests.at(-1)?.searchParams.get('t') === '12',
    '分类刷新保留所选子类',
  );
  assert(
    requests.at(-1)?.searchParams.get('pg') === '1',
    '分类刷新从第一页开始',
  );
  assert(historyRequests === 1, '分类刷新只更新当前目录');

  // 连续网络失败仍保留可读内容，并允许下一次下拉恢复。
  failMovies = true;
  pull(
    document.querySelector('[data-slot="scroll-area-viewport"]') ?? viewport,
  );
  await until(() => !refreshing());
  assert(
    document.body.textContent?.includes('影片 1-0'),
    '刷新失败保留现有内容',
  );
  assert(indicator()?.style.opacity === '0', '刷新失败后圆球收起');
  failMovies = false;

  await router.push('/history');
  await nextTick();
  assert(
    document.body.textContent?.includes('还没有观看记录'),
    '渲染实际历史空状态',
  );
  holdHistory = true;
  pull(document.querySelector('[data-slot="pull-refresh"]') ?? viewport);
  await until(refreshing);
  assert(historyRequests === 2, '空历史页可下拉同步');
  assert(indicator()?.style.opacity === '1', '历史同步期间显示圆球');
  holdHistory = false;
  finishHistory();
  await until(() => !refreshing());

  history.syncStatus = 'error';
  await nextTick();
  pull(
    document.querySelector('[data-slot="scroll-area-viewport"]') ?? viewport,
  );
  await until(() => !refreshing());
  assert(historyRequests === 3, '历史错误状态可下拉重试');

  // 回到缓存概览后仍能继续使用刷新，列表滚动位置保持在顶部。
  await router.push('/overview');
  await until(() => Boolean(document.querySelector('.pull-refresh-enabled')));
  pull(
    document.querySelector('[data-slot="scroll-area-viewport"]') ?? viewport,
  );
  await until(() => !refreshing());
  assert(
    historyRequests === 4,
    `缓存页面重新激活后恢复下拉刷新：${historyRequests}`,
  );
  assert(indicator()?.getBoundingClientRect().width === 40, '圆球直径为 40px');
};

run()
  .then(() => {
    document.documentElement.dataset.result = 'passed';
    document
      .getElementById('status')
      ?.replaceChildren('移动端下拉刷新交互测试通过');
  })
  .catch((error: unknown) => {
    document.documentElement.dataset.result = 'failed';
    document.getElementById('status')?.replaceChildren(String(error));
  });
