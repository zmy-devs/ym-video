import { createApp } from 'vue';
import { createPinia } from 'pinia';
import '../../src/styles/global.css';

// 通过实际请求取消与路由结果，回归首屏服务无响应的场景。
const run = async () => {
  // 测试结束后恢复页面地址和网络实现。
  const originalUrl = window.location.href;
  const originalFetch = window.fetch;

  // 首轮模拟无响应，后续分别验证匿名用户与两种账号权限。
  let mode: 'pending' | 'anonymous' | 'user' | 'admin' = 'pending';
  let abortedRequests = 0;
  const pendingRequests: Array<(response: Response) => void> = [];

  window.fetch = async (input, options) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      window.location.origin,
    );

    if (!url.pathname.startsWith('/api/')) {
      return originalFetch(input, options);
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

    return Response.json({
      user: { id: 'navigation-test', role: mode },
      session: { id: 'session-test' },
    });
  };

  // 在创建 WebHistory 前设置业务地址，保留查询参数。
  window.history.replaceState(null, '', '/history?test=session-timeout');

  // 动态加载让 Better Auth 捕获模拟 fetch，所有请求均留在内存。
  const { router } = await import('../../src/router');
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
        fixture.textContent?.includes('正在连接账号服务'),
        '等待首次会话时必须显示连接状态',
      );
      await until(() => router.currentRoute.value.name === 'login');
      assert(abortedRequests === 1, '超时必须取消真实会话请求');
      assert(
        router.currentRoute.value.query.redirect ===
          '/history?test=session-timeout',
        '超时回退应保留原页面和查询参数',
      );
      assert(
        fixture.textContent?.includes('欢迎回来'),
        '服务无响应时应显示登录表单',
      );
      report('首屏有连接提示，3 秒后取消请求并显示登录表单，保留回跳地址');
    } finally {
      app.unmount();
      pendingRequests.forEach((resolve) => resolve(Response.json(null)));
    }

    mode = 'anonymous';
    await router.replace('/history');
    assert(router.currentRoute.value.name === 'login', '匿名用户须进入登录');
    report('匿名用户不能进入业务页面');

    mode = 'user';
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

    mode = 'admin';
    await router.replace('/login');
    assert(
      router.currentRoute.value.path === '/admin/users',
      '管理员应进入后台',
    );
    report('管理员会话正常进入后台');
  } finally {
    window.fetch = originalFetch;
    window.history.replaceState(null, '', originalUrl);
  }
};

// 等待异步路由完成，同时限制回退不得再次等待一轮会话。
const until = async (ready: () => boolean) => {
  const deadline = Date.now() + 4500;

  while (!ready()) {
    if (Date.now() > deadline) {
      throw new Error('会话超时后未及时显示登录页');
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
        status.textContent = '全部通过（4 个场景）';
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
