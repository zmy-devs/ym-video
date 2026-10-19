import { createApp, h, nextTick } from 'vue';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { eventBus } from '../../src/utils/event-bus';
import { useThemeStore } from '../../src/stores/theme';
import '../../src/styles/global.css';

// 所有写入均留在测试页面内存，不访问开发 API。
const mount = async () => {
  // 每次挂载使用独立的模拟账号。
  let user = {
    id: 'settings-fixture',
    username: 'settings_user',
    name: 'settings_user',
    email: 'settings@example.test',
    role: 'user',
    emailVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 保存原始浏览器能力和偏好，清理后恢复。
  const originalFetch = window.fetch;
  const previousMode = localStorage.getItem('ym-video:theme-mode');
  const previousColor = localStorage.getItem('ym-video:theme-color');
  const pinia = createPinia();
  const theme = useThemeStore(pinia);
  const originalMode = theme.mode;
  const originalColor = theme.color;
  const requests: { path: string; body: Record<string, unknown> }[] = [];

  // 可主动挂起请求，验证重复提交和关闭取消。
  let hold = false;
  let release: (() => void) | undefined;
  let aborted = false;

  window.fetch = async (input, options) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      location.origin,
    );
    if (url.pathname === '/api/auth/get-session') {
      return Response.json({
        user,
        session: {
          id: 'settings-session',
          userId: user.id,
          token: 'fixture-only',
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        },
      });
    }
    if (url.pathname.startsWith('/api/auth/')) {
      const body = JSON.parse(String(options?.body ?? '{}')) as Record<
        string,
        unknown
      >;
      requests.push({ path: url.pathname, body });
      if (hold) {
        await new Promise<void>((resolve, reject) => {
          release = resolve;
          options?.signal?.addEventListener(
            'abort',
            () => {
              aborted = true;
              reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true },
          );
        });
      }
      if (url.pathname === '/api/auth/update-user') {
        if (body.username === 'taken_user') {
          return Response.json(
            { code: 'USERNAME_IS_ALREADY_TAKEN', message: 'Taken' },
            { status: 400 },
          );
        }
        user = {
          ...user,
          username: String(body.username),
          name: String(body.name),
        };
        return Response.json({ status: true });
      }
      if (url.pathname === '/api/auth/change-password') {
        if (body.currentPassword !== 'fixture-old-password') {
          return Response.json(
            { code: 'INVALID_PASSWORD', message: 'Invalid password' },
            { status: 400 },
          );
        }
        return Response.json({ token: 'fixture-new-session', user });
      }
    }
    throw new Error(`测试页禁止访问：${url.pathname}`);
  };

  // Better Auth 创建时固定 fetch，必须先安装模拟接口再加载真实组件。
  const [{ default: AdminLayout }, { default: AppDialogs }, { authClient }] =
    await Promise.all([
      import('../../src/layout/admin-layout.vue'),
      import('../../src/dialogs/index.vue'),
      import('../../src/services/auth'),
    ]);

  // 使用真实布局和用户菜单，内容页以占位组件隔离业务请求。
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/admin',
        component: AdminLayout,
        children: [
          {
            path: 'users',
            component: { render: () => h('p', { class: 'p-6' }, '设置预览') },
          },
        ],
      },
    ],
  });
  await router.push('/admin/users');
  await router.isReady();

  const app = createApp({ render: () => [h(RouterView), h(AppDialogs)] });
  app.use(pinia);
  app.use(router);
  app.mount('#fixture');
  await authClient.useSession().value.refetch();
  await until(
    () =>
      document
        .getElementById('account-menu-trigger')
        ?.getAttribute('aria-label')
        ?.includes('settings_user') === true,
  );

  return {
    requests,
    theme,
    hold: () => {
      hold = true;
    },
    release: () => {
      hold = false;
      release?.();
    },
    aborted: () => aborted,
    switchAccount: async () => {
      user = {
        ...user,
        id: 'settings-next',
        username: 'next_user',
        name: 'next_user',
      };
      await authClient.useSession().value.refetch();
    },
    cleanup: () => {
      release?.();
      app.unmount();
      theme.setMode(originalMode);
      theme.setColor(originalColor);
      theme.$dispose();
      window.fetch = originalFetch;
      for (const [key, value] of [
        ['ym-video:theme-mode', previousMode],
        ['ym-video:theme-color', previousColor],
      ] as const) {
        if (value === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, value);
        }
      }
    },
  };
};

// 模拟真实菜单点击流程，检验菜单到弹窗的焦点交接。
const openSettings = async () => {
  click('#account-menu-trigger');
  await until(() => !!document.querySelector('[role="menuitem"]'));
  const items = [
    ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ];
  assert(
    items.map((item) => item.textContent?.trim()).join(',') === '设置,退出登录',
    '设置应位于退出登录上方',
  );
  items[0].click();
  await until(() => !!document.querySelector('[role="dialog"]'));
  await nextTick();
};

// 由真实按钮触发表单提交，避免绕过禁用状态。
const submit = async (text: string) => {
  await nextTick();
  const button = [
    ...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'),
  ].find(
    (item) =>
      (item.getAttribute('aria-label') ?? item.textContent?.trim()) === text,
  );
  assert(button && !button.disabled, `按钮不可用：${text}`);
  button?.click();
  await nextTick();
};

// 模拟输入事件触发组件 v-model。
const fill = (id: string, value: string) => {
  const input = document.getElementById(id);
  assert(input instanceof HTMLInputElement, `缺少输入框：${id}`);
  if (input instanceof HTMLInputElement) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
};

// 统一通过 DOM 执行测试页内的点击。
const click = (selector: string) => {
  const element = document.querySelector<HTMLElement>(selector);
  assert(element, `缺少控件：${selector}`);
  element?.click();
};

// 通过可见分类名称操作，不依赖 Reka 生成的控件 ID。
const selectTab = (label: string) => {
  const tab = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find(
    (item) => item.textContent?.trim() === label,
  );
  assert(tab, `缺少分类：${label}`);
  tab?.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
  );
};

// 等待真实组件响应，不依赖固定加载延迟。
const until = async (ready: () => boolean) => {
  const deadline = Date.now() + 5000;
  while (!ready()) {
    if (Date.now() > deadline) {
      throw new Error('等待设置页面超时');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

// 失败立即停止，不把后续步骤误报为通过。
const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

// 浏览器直接显示每个行为场景的结果。
const report = (message: string) => {
  const item = document.createElement('li');
  item.textContent = `通过：${message}`;
  document.getElementById('results')?.append(item);
};

// 所有密码仅为固定测试字符串，实际凭据 API 被内存模拟替代。
const run = async () => {
  const fixture = await mount();
  try {
    assert(
      !document.querySelector('button[aria-label="设置"]'),
      '侧栏不应有独立设置按钮',
    );
    await openSettings();
    assert(
      document.querySelectorAll('[role="dialog"]').length === 1,
      '设置应只有一个实例',
    );
    await until(() => !!document.activeElement?.closest('[role="dialog"]'));
    assert(
      document
        .querySelector('[role="tab"][data-state="active"]')
        ?.textContent?.trim() === '外观',
      '首次打开应展示外观',
    );
    report('用户菜单入口顺序、弹窗单例和焦点交接');

    document
      .getElementById('settings-theme-mode')
      ?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    await until(() => !!document.querySelector('[role="option"]'));
    const dark = [
      ...document.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((item) => item.textContent?.trim() === '深色');
    dark?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await until(() => document.documentElement.classList.contains('dark'));
    document
      .getElementById('settings-theme-color')
      ?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    await until(() => !!document.querySelector('[role="option"]'));
    const blue = [
      ...document.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((item) => item.textContent?.trim() === '蓝色');
    blue?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await until(() => document.documentElement.dataset.themeColor === 'blue');
    report('明暗主题和主题色即时生效');

    selectTab('关于');
    await until(
      () => !!document.querySelector('[role="tabpanel"] a[href$="/issues"]'),
    );
    assert(
      !document.querySelector('[role="tablist"] a'),
      '反馈入口应位于关于内容中',
    );
    report('关于分类显示反馈入口，侧栏不再单独展示反馈');

    selectTab('账号');
    await until(() => !!document.getElementById('settings-username'));
    const usernameSave = document.querySelector<HTMLButtonElement>(
      'button[aria-label="保存用户名"]',
    );
    assert(usernameSave?.disabled === true, '未修改时保留保存按钮并禁用');
    usernameSave?.click();
    await nextTick();
    assert(!fixture.requests.length, '未修改时不能提交保存');
    fill('settings-username', 'changed_user');
    await nextTick();
    assert(
      usernameSave?.closest('[data-slot="input-group"]') &&
        !usernameSave.disabled,
      '修改后应启用输入框内的保存按钮',
    );
    fill('settings-username', 'settings_user');
    await nextTick();
    assert(usernameSave?.disabled === true, '恢复原用户名时禁用保存按钮');
    fill('settings-username', 'ab');
    await submit('保存用户名');
    assert(
      document
        .getElementById('settings-username')
        ?.getAttribute('aria-invalid') === 'true',
      '非法用户名应显示字段错误',
    );
    assert(!fixture.requests.length, '校验失败不能写入');
    fill('settings-username', 'taken_user');
    await submit('保存用户名');
    await until(
      () =>
        document
          .getElementById('settings-username-error')
          ?.textContent?.includes('已被使用') === true,
    );
    fill('settings-username', 'Renamed.User');
    await submit('保存用户名');
    await until(
      () =>
        document
          .getElementById('account-menu-trigger')
          ?.getAttribute('aria-label')
          ?.includes('renamed.user') === true,
    );
    assert(
      fixture.requests.at(-1)?.body.name === 'renamed.user',
      '展示名应随用户名一起更新',
    );
    await nextTick();
    assert(usernameSave?.disabled === true, '保存后应保留保存按钮并禁用');
    report('用户名保存按钮按变更启用、字段校验和保存后菜单同步');

    fill('settings-currentPassword', 'fixture-old-password');
    fill('settings-newPassword', 'fixture-new-password');
    fill('settings-confirmPassword', 'mismatch');
    await submit('修改密码');
    assert(
      document
        .getElementById('settings-confirmPassword')
        ?.getAttribute('aria-invalid') === 'true',
      '确认不一致应拦截',
    );
    fill('settings-currentPassword', 'wrong-password');
    fill('settings-confirmPassword', 'fixture-new-password');
    await submit('修改密码');
    await until(
      () =>
        document
          .getElementById('settings-currentPassword-error')
          ?.textContent?.includes('不正确') === true,
    );
    fill('settings-currentPassword', 'fixture-old-password');
    fill('settings-newPassword', ' fixture-new-password ');
    fill('settings-confirmPassword', ' fixture-new-password ');
    await submit('修改密码');
    await until(
      () =>
        (
          document.getElementById(
            'settings-currentPassword',
          ) as HTMLInputElement
        )?.value === '',
    );
    assert(
      fixture.requests.at(-1)?.body.newPassword === ' fixture-new-password ',
      '密码不能 trim',
    );
    assert(
      fixture.requests.at(-1)?.body.revokeOtherSessions === true,
      '应撤销其他会话',
    );
    report('密码确认、旧密码错误、原样提交和成功后清空');

    fill('settings-currentPassword', 'draft');
    click('[data-slot="dialog-close"]');
    await until(() => !document.querySelector('[role="dialog"]'));
    await until(() => document.activeElement?.id === 'account-menu-trigger');
    await openSettings();
    selectTab('账号');
    await until(() => !!document.getElementById('settings-currentPassword'));
    assert(
      (document.getElementById('settings-currentPassword') as HTMLInputElement)
        .value === '',
      '重新打开不能保留密码草稿',
    );
    report('关闭恢复头像焦点，重新打开清除密码草稿');

    fixture.hold();
    fill('settings-username', 'pending_user');
    await submit('保存用户名');
    await until(
      () => fixture.requests.at(-1)?.body.username === 'pending_user',
    );
    assert(
      !document.querySelector('[data-slot="dialog-close"]'),
      '提交期间不能手动关闭',
    );
    assert(
      [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')].every(
        (item) => item.disabled,
      ),
      '提交期间不能切换分类',
    );
    const count = fixture.requests.length;
    eventBus.emit('dialogs:close');
    await until(() => !document.querySelector('[role="dialog"]'));
    await until(fixture.aborted);
    fixture.release();
    await openSettings();
    assert(fixture.requests.length === count, '取消后不能自动重试写入');
    report('提交状态保护、切页关闭取消请求和禁止自动重试');

    await fixture.switchAccount();
    await until(() => !document.querySelector('[role="dialog"]'));
    report('切换账号自动关闭设置');
  } finally {
    fixture.cleanup();
  }
};

// 人工启动测试后在页面展示汇总。
document.getElementById('run')?.addEventListener('click', () => {
  document
    .querySelectorAll<HTMLButtonElement>('#run, #preview')
    .forEach((button) => {
      button.disabled = true;
    });
  run().then(
    () => {
      const status = document.getElementById('status');
      if (status) {
        status.textContent = `全部通过（${document.querySelectorAll('#results li').length} 个场景）`;
      }
    },
    (cause: unknown) => {
      const status = document.getElementById('status');
      if (status) {
        status.textContent = `失败：${cause instanceof Error ? cause.message : String(cause)}`;
      }
    },
  );
});

// 预览保留模拟数据，用于批量核实明暗主题和账号布局。
document.getElementById('preview')?.addEventListener('click', () => {
  document
    .querySelectorAll<HTMLButtonElement>('#run, #preview')
    .forEach((button) => {
      button.disabled = true;
    });
  mount().then(
    async () => {
      await openSettings();
    },
    (cause: unknown) => {
      const status = document.getElementById('status');
      if (status) {
        status.textContent = String(cause);
      }
    },
  );
});
