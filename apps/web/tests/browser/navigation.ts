import { createApp, h, nextTick } from 'vue';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import AppLayout from '../../src/layout/index.vue';
import Catalogue from '../../src/views/catalogue.vue';
import History from '../../src/views/history.vue';
import AdminLayout from '../../src/layout/admin-layout.vue';
import Users from '../../src/views/admin/users.vue';
import Invitations from '../../src/views/admin/invitations.vue';
import AppDialogs from '../../src/dialogs/index.vue';
import { eventBus } from '../../src/utils/event-bus';
import { useLibraryStore } from '../../src/stores/library';
import '../../src/styles/global.css';

// 真实组件只访问此测试页的模拟接口，不读写开发数据库。
const run = async () => {
  // 保存每次请求，检查切页不会从旧页面发起多余查询。
  const requests: URL[] = [];

  const originalFetch = window.fetch;
  // 搜索记录只用于本轮测试，结束后恢复浏览器原值。
  const previousSearches = localStorage.getItem('ym-video:searches');

  // 后台写入只计数，不访问真实账号与邀请数据。
  let userCreates = 0;
  let invitationCreates = 0;
  let deleteAttempts = 0;
  const pinia = createPinia();
  const library = useLibraryStore(pinia);
  library.selected = 'navigation-test';
  library.sources = [{ id: 'navigation-test', name: '导航测试源' }];
  library.categories = [{ id: 1, parentId: 0, name: '测试分类' }];

  // 挂起新页数据，验证等待期间不会把旧列表改成新标题。
  let release: (() => void) | undefined;
  let hold: Promise<void> | undefined;
  window.fetch = async (input, options) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      window.location.origin,
    );
    if (url.pathname.startsWith('/api/v1/admin/')) {
      if (options?.method === 'POST') {
        if (url.pathname.endsWith('/users')) {
          userCreates += 1;
          return Response.json({ success: true });
        }

        invitationCreates += 1;
        return Response.json({
          invitation: {
            id: 'created',
            name: '测试分享',
            token: 'created-token',
            createdAt: 0,
            usedAt: null,
          },
        });
      }

      if (options?.method === 'DELETE') {
        deleteAttempts += 1;

        if (deleteAttempts === 1) {
          return Response.json({ message: '模拟删除失败' }, { status: 500 });
        }

        return Response.json({ success: true });
      }

      const items = Array.from({ length: 20 }, (_, index) =>
        url.pathname.endsWith('/users')
          ? {
              id: `user-${index}`,
              name: `navigation_user_${index}`,
              username: `navigation_user_${index}`,
              email: `user${index}@example.com`,
              role: 'user',
              banned: false,
            }
          : {
              id: `invite-${index}`,
              name: `navigation_invitation_${index}`,
              token: `token-${index}`,
              createdAt: 0,
              usedAt: null,
            },
      );
      return Response.json({ items, total: 20, page: 1, pageSize: 20 });
    }
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
        path: '/admin',
        component: AdminLayout,
        children: [
          { path: 'users', component: Users },
          { path: 'invitations', component: Invitations },
        ],
      },
      {
        path: '/',
        component: AppLayout,
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
  const fixture = document.querySelector('#fixture');
  if (!fixture) {
    throw new Error('测试容器不存在');
  }
  const app = createApp({ render: () => [h(RouterView), h(AppDialogs)] })
    .use(pinia)
    .use(router);
  app.mount(fixture);

  try {
    await until(() => Boolean(fixture.textContent?.includes('概览影片29')));
    const sidebar = fixture.querySelector('[data-slot="sidebar"]');
    const previousPage = fixture.querySelector('.page-content');
    const previousViewport = fixture.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!previousPage || !previousViewport) {
      throw new Error('概览页未就绪');
    }
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
    const currentViewport = fixture.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    assert(currentViewport !== previousViewport, '新页面应有独立滚动区域');
    assert(currentViewport?.scrollTop === 0, '新页面应从顶部展示');
    assert(
      fixture.textContent?.includes('正在加载影片'),
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
    const previousSearch = fixture.querySelector('.page-content');
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
      fixture.querySelector('.page-content') === previousPage,
      '返回概览应复用原页面实例',
    );
    report('概览页面缓存：复用原页面，不重复请求最近更新');

    await router.push('/admin/users');
    await until(() =>
      Boolean(fixture.textContent?.includes('navigation_user_19')),
    );
    const previousAdminViewport = fixture.querySelector<HTMLElement>(
      '[data-slot="sidebar-inset"] .overflow-auto',
    );
    if (!previousAdminViewport) {
      throw new Error('后台滚动容器未就绪');
    }
    previousAdminViewport.scrollTop = 150;
    assert(previousAdminViewport.scrollTop > 0, '测试必须先滚动后台列表');
    const adminSidebar = fixture.querySelector('[data-slot="sidebar"]');
    await router.push('/admin/invitations');
    await until(() =>
      Boolean(fixture.textContent?.includes('navigation_invitation_19')),
    );
    const nextAdminViewport = fixture.querySelector<HTMLElement>(
      '[data-slot="sidebar-inset"] .overflow-auto',
    );
    assert(
      nextAdminViewport?.scrollTop === 0,
      '后台切页不能继承上一个表格的滚动位置',
    );
    assert(
      adminSidebar === fixture.querySelector('[data-slot="sidebar"]'),
      '后台切页应保留侧栏实例',
    );
    report('后台表格切换：独立滚动位置，侧栏保留');

    document.getElementById('invitations-create')?.click();
    await until(() => Boolean(document.getElementById('invitation-name')));
    fill('invitation-name', '测试分享');
    await nextTick();
    document
      .querySelector<HTMLFormElement>('[role="dialog"] form')
      ?.requestSubmit();
    await until(() => Boolean(document.getElementById('created-invitation')));
    assert(
      invitationCreates === 1 &&
        document
          .querySelector<HTMLInputElement>('#created-invitation')
          ?.value.endsWith('/invite/created-token'),
      '邀请由根弹窗生成并展示链接',
    );
    document.querySelector<HTMLElement>('[data-slot="dialog-close"]')?.click();
    await until(() => !document.querySelector('[role="dialog"]'));
    assert(
      document.activeElement?.id === 'invitations-create',
      '邀请弹窗关闭恢复新增入口',
    );
    report('根邀请弹窗生成链接并恢复焦点');

    document
      .querySelector<HTMLElement>('[aria-label="邀请链接的更多操作"]')
      ?.click();
    await until(() => Boolean(document.querySelector('[role="menu"]')));
    [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')]
      .find((item) => item.textContent?.includes('删除链接'))
      ?.click();
    await until(() => Boolean(document.querySelector('[role="alertdialog"]')));
    document
      .querySelector<HTMLElement>(
        '[role="alertdialog"] [data-variant="destructive"]',
      )
      ?.click();
    await until(() =>
      Boolean(document.querySelector('[role="alertdialog"] [role="alert"]')),
    );
    assert(
      document
        .querySelector('[role="alertdialog"]')
        ?.textContent?.includes('模拟删除失败'),
      '后台删除失败保留确认框',
    );
    document
      .querySelector<HTMLElement>(
        '[role="alertdialog"] [data-variant="destructive"]',
      )
      ?.click();
    await until(() => !document.querySelector('[role="alertdialog"]'));
    assert(deleteAttempts === 2, '后台删除重试只提交当前目标');
    report('后台删除接入统一确认框，支持失败反馈和重试');

    await router.push('/admin/users');
    await until(() => Boolean(document.getElementById('users-create')));
    document.getElementById('users-create')?.click();
    await until(() => Boolean(document.getElementById('new-username')));
    eventBus.emit('account:show');
    assert(
      document.querySelectorAll('[role="dialog"]').length === 1,
      '重复账号事件保持单例',
    );
    fill('new-username', 'test_user');
    fill('new-email', 'test@example.com');
    fill('new-password', 'test-password');
    await nextTick();
    document
      .querySelector<HTMLFormElement>('[role="dialog"] form')
      ?.requestSubmit();
    await until(() => !document.querySelector('[role="dialog"]'));
    assert(userCreates === 1, '账号弹窗只创建一次');
    document.getElementById('users-create')?.click();
    await until(() => Boolean(document.getElementById('new-username')));
    assert(
      document.querySelector<HTMLInputElement>('#new-password')?.value === '',
      '重新打开不保留密码',
    );
    await router.push('/overview');
    await until(() => !document.querySelector('[role="dialog"]'));
    report('根账号弹窗保持单例，重开清空密码，切页关闭');

    localStorage.setItem('ym-video:searches', JSON.stringify(['测试搜索记录']));
    document.getElementById('search-trigger')?.click();
    await until(() => Boolean(document.getElementById('search-keyword')));
    [...document.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((item) => item.textContent?.includes('清空搜索历史'))
      ?.click();
    await until(() => Boolean(document.querySelector('[role="alertdialog"]')));
    [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[role="alertdialog"] button',
      ),
    ]
      .find((button) => button.textContent === '取消')
      ?.click();
    await until(() => !document.querySelector('[role="alertdialog"]'));
    assert(
      document
        .querySelector('[role="dialog"]')
        ?.textContent?.includes('测试搜索记录'),
      '取消确认后保留搜索记录和弹窗',
    );
    [...document.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((item) => item.textContent?.includes('清空搜索历史'))
      ?.click();
    await until(() => Boolean(document.querySelector('[role="alertdialog"]')));
    document
      .querySelector<HTMLElement>(
        '[role="alertdialog"] [data-variant="destructive"]',
      )
      ?.click();
    await until(() => !document.querySelector('[role="alertdialog"]'));
    assert(
      localStorage.getItem('ym-video:searches') === '[]' &&
        Boolean(document.querySelector('[role="dialog"]')),
      '确认清空只删除记录，保留搜索弹窗',
    );
    fill('search-keyword', '测试片名');
    await nextTick();
    [...document.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((item) => item.textContent?.includes('搜索“测试片名”'))
      ?.click();
    await until(
      () =>
        router.currentRoute.value.query.q === '测试片名' &&
        !document.querySelector('[role="dialog"]'),
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
      throw new Error('等待页面超时');
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
