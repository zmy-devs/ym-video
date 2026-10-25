import { createApp, nextTick } from 'vue';
import { createPinia } from 'pinia';
import { emptyHistory } from '@ym-video/history';
import '../../src/styles/global.css';

// 通过实际请求取消与路由结果，回归首屏服务无响应的场景。
const run = async () => {
  // 测试结束后恢复页面地址和网络实现。
  const originalUrl = window.location.href;
  const originalFetch = window.fetch;
  // 模拟桌面环境，验证首次会话等待期间的标题栏。
  const originalIpc = Object.getOwnPropertyDescriptor(window, 'ipc');

  Object.defineProperty(window, 'ipc', {
    configurable: true,
    value: {
      getVersion: async () => '6.1.4',
      checkForUpdates: async () => false,
      installUpdate: async () => undefined,
      on: () => () => undefined,
    } satisfies NonNullable<Window['ipc']>,
  });

  // 首轮模拟无响应，后续分别验证匿名用户与两种账号权限。
  let mode:
    | 'pending'
    | 'anonymous'
    | 'user'
    | 'admin'
    | 'forbidden'
    | 'unavailable'
    | 'recovery' = 'pending';
  let abortedRequests = 0;
  // 统计守卫和后台监听的会话请求，检查业务导航是否新增验证。
  let sessionRequests = 0;
  // 恢复场景前两次故障，第三次返回有效会话。
  let recoveryRequests = 0;
  const pendingRequests: Array<(response: Response) => void> = [];

  window.fetch = async (input, options) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      window.location.origin,
    );

    if (!url.pathname.startsWith('/api/')) {
      return originalFetch(input, options);
    }

    // 重试成功会挂载真实主布局，业务接口需返回对应契约的数据。
    if (!url.pathname.startsWith('/api/auth/')) {
      if (url.pathname.startsWith('/api/v1/history')) {
        return Response.json(emptyHistory('navigation-test'));
      }

      if (url.pathname === '/api/v1/proxy/sources') {
        return Response.json({
          sources: [{ id: 'navigation-test', name: '会话测试源' }],
        });
      }

      return Response.json({
        class: [{ type_id: 1, type_name: '测试分类' }],
        list: [],
        pagecount: 1,
      });
    }

    if (url.pathname === '/api/auth/get-session') {
      sessionRequests += 1;
    }

    if (mode === 'pending') {
      return new Promise<Response>((resolve, reject) => {
        pendingRequests.push(resolve);
        options?.signal?.addEventListener(
          'abort',
          () => {
            abortedRequests += 1;
            reject(options.signal?.reason);
          },
          { once: true },
        );
      });
    }

    if (mode === 'anonymous') {
      return Response.json(null);
    }

    if (
      mode === 'unavailable' ||
      (mode === 'recovery' && ++recoveryRequests < 3)
    ) {
      return Response.json({ message: '模拟服务故障' }, { status: 503 });
    }

    if (mode === 'forbidden') {
      return Response.json({ message: '测试账号已停用' }, { status: 403 });
    }

    return Response.json({
      user: {
        id: 'navigation-test',
        name: '会话测试',
        email: 'navigation@example.com',
        role: mode === 'recovery' ? 'user' : mode,
      },
      session: { id: 'session-test' },
    });
  };

  // 在创建 WebHistory 前设置业务地址，保留查询参数。
  window.history.replaceState(null, '', '/history?test=session-timeout');

  // 动态加载让 Better Auth 捕获模拟 fetch，所有请求均留在内存。
  const { router } = await import('../../src/router');
  const { authClient, verifySession } = await import('../../src/services/auth');
  const { default: App } = await import('../../src/App.vue');
  const fixture = document.querySelector('#fixture');

  if (!fixture) {
    throw new Error('测试容器不存在');
  }

  // 首屏直接挂载真实根组件，检查等待与回退均有可见内容。
  const app = createApp(App).use(createPinia()).use(router);
  app.mount(fixture);

  try {
    try {
      assert(
        fixture.querySelector('[data-slot="spinner"][aria-label="加载中"]') &&
          !fixture.textContent?.trim(),
        '等待首次会话时只显示 Spinner，不显示文字',
      );
      // 加载态标题栏透明且无分隔线，保留原生按钮和拖动区域。
      const titleBar = fixture.querySelector('.desktop-title-bar');

      assert(
        titleBar &&
          getComputedStyle(titleBar).borderBottomWidth === '0px' &&
          getComputedStyle(titleBar).backgroundColor === 'rgba(0, 0, 0, 0)',
        '桌面加载态标题栏应无背景色和底边框',
      );
      await until(() => router.currentRoute.value.name === 'login');
      assert(abortedRequests >= 5, '五次校验超时都必须取消真实会话请求');
      assert(
        document.body.textContent?.includes('登录状态验证失败，请重试'),
        '五次失败后应显示重试 toast',
      );
      assert(
        router.currentRoute.value.query.redirect ===
          '/history?test=session-timeout',
        '超时回退应保留原页面和查询参数',
      );
      assert(
        fixture.textContent?.includes('欢迎回来'),
        '服务无响应时应显示登录表单',
      );
      assert(
        titleBar &&
          getComputedStyle(titleBar).borderBottomWidth === '0px' &&
          getComputedStyle(titleBar).backgroundColor === 'rgba(0, 0, 0, 0)',
        '桌面登录页标题栏应无背景色和底边框',
      );
      // 透明标题栏露出的底层颜色与登录页主体保持一致。
      const loginPage = fixture.querySelector('.login-page');

      assert(
        loginPage &&
          getComputedStyle(document.body).backgroundColor ===
            getComputedStyle(loginPage).backgroundColor,
        '透明标题栏与登录页背景应同色',
      );
      report(
        '加载和登录页标题栏均无背景色及底边框，五次超时后保留登录入口与回跳地址',
      );

      // 点击实际提示按钮，恢复会话后直接回到原业务地址。
      const retry = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          '[data-sonner-toast] button',
        ),
      ).find((button) => button.textContent === '重试');

      assert(retry, '会话失败 toast 必须提供重试按钮');
      mode = 'user';
      retry?.click();
      await until(
        () =>
          router.currentRoute.value.fullPath ===
          '/history?test=session-timeout',
      );
      await nextTick();
      report('点击 Toast 重试后重新验证会话，并恢复原业务地址');

      // 从登录页自身重试也必须执行守卫，不能被同地址导航去重。
      mode = 'anonymous';
      await authClient.$store.atoms.session.get().refetch();
      await until(() => router.currentRoute.value.name === 'login');
      await nextTick();
      mode = 'unavailable';
      await router.replace('/login');
      // 新提示的按钮应能强制重进当前登录路由。
      const loginRetry = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          '[data-sonner-toast] button',
        ),
      ).find((button) => button.textContent === '重试');

      assert(loginRetry, '登录页会话失败也必须提供重试按钮');
      mode = 'anonymous';
      // 使用请求计数判断按钮确实触发校验。
      const beforeLoginRetry = sessionRequests;
      // 同地址强制导航完成后才卸载根组件，避免打断尚未结束的渲染。
      let loginRetryComplete = false;
      // 完成钩子覆盖原地导航，不能只靠路径相同判断成功。
      const stopLoginNavigation = router.afterEach(() => {
        loginRetryComplete = true;
      });
      loginRetry?.click();
      await until(() => sessionRequests > beforeLoginRetry);
      await until(() => loginRetryComplete);
      stopLoginNavigation();
      await nextTick();
      assert(
        router.currentRoute.value.name === 'login',
        '匿名重试后仍保留登录表单',
      );
      report('登录页点击重试确实请求会话，匿名结果保留登录入口');
    } finally {
      app.unmount();
      pendingRequests.forEach((resolve) => resolve(Response.json(null)));
    }

    mode = 'unavailable';
    // 显式调用与路由共用的校验，精确核对请求上限。
    const beforeFailures = sessionRequests;
    let verificationFailed = false;
    try {
      await verifySession(new AbortController().signal);
    } catch {
      verificationFailed = true;
    }
    assert(
      verificationFailed && sessionRequests - beforeFailures === 5,
      '服务持续故障时总共只验证五次',
    );
    report('503 和客户端错误结果同样最多验证五次，不叠加额外重试');

    mode = 'recovery';
    // 短暂故障恢复后立即结束，避免继续发送剩余请求。
    const beforeRecovery = sessionRequests;
    const recovered = await verifySession(new AbortController().signal);
    assert(
      recovered?.user.role === 'user' && sessionRequests - beforeRecovery === 3,
      '第三次恢复后应立即返回会话',
    );
    report('短暂故障后自动恢复会话，不用尽剩余重试');

    mode = 'unavailable';
    // 新导航取消旧校验时，等待中的重试也应取消。
    const controller = new AbortController();
    const beforeCancellation = sessionRequests;
    const cancelled = verifySession(controller.signal).catch(() => null);
    await until(() => sessionRequests > beforeCancellation);
    controller.abort();
    await cancelled;
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert(
      sessionRequests === beforeCancellation + 1,
      '取消校验后不能继续重试',
    );
    report('取消校验会停止旧请求和重试等待');

    mode = 'anonymous';
    await authClient.$store.atoms.session.get().refetch();
    // 匿名响应是有效校验结果，直接结束且无需重试。
    const beforeAnonymous = sessionRequests;
    const anonymous = await verifySession(new AbortController().signal);
    assert(
      !anonymous && sessionRequests === beforeAnonymous + 1,
      '正常未登录不需要重复校验',
    );
    await router.replace('/history');
    assert(router.currentRoute.value.name === 'login', '匿名用户须进入登录');
    report('匿名用户不能进入业务页面');

    mode = 'user';
    await authClient.$store.atoms.session.get().refetch();
    await router.replace('/login?redirect=%2Fhistory%3Ftest%3Dreturn');
    assert(
      router.currentRoute.value.fullPath === '/history?test=return',
      `登录会话应正常回跳，实际为 ${router.currentRoute.value.fullPath}`,
    );
    await router.replace('/admin/users');
    assert(
      router.currentRoute.value.path === '/overview',
      '普通用户不能进入后台',
    );
    report('普通用户正常回跳，后台权限仍受限制');

    // 会话服务无响应期间，已登录用户的播放和普通页面导航不依赖网络。
    const previousRequests = sessionRequests;
    mode = 'pending';
    await router.replace('/player/source/movie?test=nonblocking');
    await router.replace('/history');
    assert(
      sessionRequests === previousRequests,
      '已确认会话后进入和返回播放器不得再次请求账号接口',
    );
    report('账号接口无响应时，已登录用户仍可进入和返回播放器');

    mode = 'forbidden';
    await authClient.$store.atoms.session.get().refetch();
    await router.replace('/overview');
    assert(
      router.currentRoute.value.name === 'login',
      '服务端明确拒绝会话后，不得沿用旧账号进入业务页面',
    );
    report('会话返回 403 后仍回到登录页，不沿用旧账号');

    mode = 'admin';
    await authClient.$store.atoms.session.get().refetch();
    await router.replace('/login');
    assert(
      router.currentRoute.value.path === '/admin/users',
      '管理员应进入后台',
    );
    report('管理员会话正常进入后台');
  } finally {
    window.fetch = originalFetch;
    window.history.replaceState(null, '', originalUrl);

    if (originalIpc) {
      Object.defineProperty(window, 'ipc', originalIpc);
    } else {
      Reflect.deleteProperty(window, 'ipc');
    }
  }
};

// 五次三秒超时及逐步延长的重试间隔后应完成回退。
const until = async (ready: () => boolean) => {
  const deadline = Date.now() + 30_000;

  while (!ready()) {
    if (Date.now() > deadline) {
      throw new Error(
        `等待会话回归超时，当前地址：${location.pathname}${location.search}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

// 失败立即中止，避免继续报告后续场景通过。
const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

// 将每个真实验证结果显示在浏览器页面上。
const report = (message: string) => {
  const item = document.createElement('li');
  item.textContent = `通过：${message}`;
  document.querySelector('#results')?.append(item);
};

// 人工触发一次完整回归，结果留在页面中供核对。
document.querySelector('#run')?.addEventListener('click', (event) => {
  if (event.currentTarget instanceof HTMLButtonElement) {
    event.currentTarget.disabled = true;
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
        status.textContent = `失败：${cause instanceof Error ? cause.stack || cause.message : String(cause)}`;
      }
    },
  );
});
