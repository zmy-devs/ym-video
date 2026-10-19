import { createApp, nextTick } from 'vue';
import { createPinia } from 'pinia';
import '../../src/styles/global.css';

// 使用正式鉴权守卫，阻塞多余的会话请求以复现旧页面停留。
const run = async () => {
  const originalFetch = window.fetch;
  const originalPath = location.pathname;
  let sessionRequests = 0;
  let expired = false;
  let holdSession: Promise<void> | undefined;
  let releaseSession: (() => void) | undefined;
  let holdAdminList: Promise<void> | undefined;
  let releaseAdminList: (() => void) | undefined;

  // 模拟管理员及失效会话，不连接真实 API。
  window.fetch = async (input) => {
    const path = new URL(
      input instanceof Request ? input.url : String(input),
      location.origin,
    ).pathname;
    if (path === '/api/auth/get-session') {
      sessionRequests += 1;
      if (holdSession) {
        await holdSession;
      }
      return Response.json(
        expired
          ? null
          : {
              user: {
                id: 'admin-navigation',
                name: 'navigation_admin',
                username: 'navigation_admin',
                email: 'admin@example.test',
                role: 'admin',
                banned: false,
                emailVerified: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              session: {
                id: 'navigation-session',
                userId: 'admin-navigation',
                token: 'fixture-only',
                expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
              },
            },
      );
    }
    if (path.startsWith('/api/v1/admin/')) {
      if (holdAdminList) {
        await holdAdminList;
      }
      return expired
        ? Response.json({ message: '请先登录' }, { status: 401 })
        : Response.json({ items: [], total: 0, page: 1, pageSize: 20 });
    }
    throw new Error(`测试页禁止访问：${path}`);
  };

  // Better Auth 固定创建时的 fetch，因此在模拟接口就绪后加载应用。
  const [{ router }, { default: App }, { authClient }] = await Promise.all([
    import('../../src/router'),
    import('../../src/App.vue'),
    import('../../src/services/auth'),
  ]);
  await router.replace('/admin/users');
  holdAdminList = new Promise<void>((resolve) => {
    releaseAdminList = resolve;
  });
  const app = createApp(App).use(createPinia()).use(router);
  app.mount('#fixture');

  try {
    await authClient.useSession().value.refetch();
    await until(() => Boolean(document.querySelector('#users-create')));
    assert(
      !document.querySelector('table') &&
        document.body.textContent?.includes('正在加载账号'),
      '首次加载期间不能先显示空表格',
    );
    holdAdminList = undefined;
    releaseAdminList?.();
    await until(() => !document.body.textContent?.includes('正在加载账号'));
    report('首次加载期间不显示空表格，空结果直接展示 Empty');
    await nextTick();
    const sidebar = document.querySelector('[data-slot="sidebar"]');
    const beforeSwitch = sessionRequests;
    holdSession = new Promise<void>((resolve) => {
      releaseSession = resolve;
    });

    for (const path of ['/admin/invitations', '/admin/users']) {
      const navigation = router.push(path);
      await until(() => router.currentRoute.value.path === path);
      await navigation;
      await nextTick();
      assert(
        document.querySelectorAll('#users-heading, #invitations-heading')
          .length === 1,
        '后台内容区只能保留当前页面',
      );
      assert(
        sessionRequests === beforeSwitch,
        '后台子页切换不能重复请求会话并等待旧页面',
      );
      assert(
        document.querySelector('[data-slot="sidebar"]') === sidebar,
        '切页应保留侧栏实例',
      );
    }
    report('后台双向切换不等待会话请求，只保留当前内容和同一侧栏');

    holdSession = undefined;
    releaseSession?.();
    holdAdminList = undefined;
    releaseAdminList?.();
    expired = true;
    await router.push('/admin/invitations');
    await until(() => router.currentRoute.value.path === '/login');
    await until(() => Boolean(document.querySelector('#login-heading')));
    assert(
      !document.querySelector('#invitations-heading'),
      '管理接口返回 401 后必须退出后台',
    );
    await router.push('/admin/users');
    assert(
      router.currentRoute.value.path === '/login',
      '未登录时仍须阻止进入后台',
    );
    report('会话失效后返回登录页，重新进入后台仍执行鉴权');
  } finally {
    holdSession = undefined;
    releaseSession?.();
    app.unmount();
    window.fetch = originalFetch;
    window.history.replaceState(null, '', originalPath);
  }
};

// 等待真实路由与渲染完成，同时为被会话请求阻塞的导航设置上限。
const until = async (ready: () => boolean) => {
  const deadline = Date.now() + 3000;
  while (!ready()) {
    if (Date.now() > deadline) {
      throw new Error('等待后台页面切换超时');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

// 失败时保留具体回归原因。
const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

// 每个实际行为检查展示独立结果。
const report = (message: string) => {
  const item = document.createElement('li');
  item.textContent = `通过：${message}`;
  document.querySelector('#results')?.append(item);
};

// 仅在独立测试页面由用户或浏览器工具主动运行。
document
  .querySelector<HTMLButtonElement>('#run')
  ?.addEventListener('click', () => {
    const button = document.querySelector<HTMLButtonElement>('#run');
    if (button) {
      button.disabled = true;
    }
    const status = document.querySelector('#status');
    run().then(
      () => {
        if (status) {
          status.textContent = '全部通过（3 个场景）';
        }
      },
      (cause: unknown) => {
        if (status) {
          status.textContent = `失败：${cause instanceof Error ? cause.message : String(cause)}`;
        }
      },
    );
  });
