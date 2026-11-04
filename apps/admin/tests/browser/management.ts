import { createApp, nextTick } from 'vue';
import { createPinia } from 'pinia';
import '../../src/styles/global.css';

// 管理业务在独立应用中使用内存接口验证。
const run = async () => {
  const originalFetch = window.fetch;
  const originalPath = location.href;
  let userCreates = 0;
  let invitationCreates = 0;
  let deleteAttempts = 0;
  window.fetch = async (input, options) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      location.origin,
    );
    if (url.pathname.startsWith('/api/auth/')) {
      return Response.json({
        user: {
          id: 'management-admin',
          name: 'management_admin',
          username: 'management_admin',
          email: 'admin@example.test',
          role: 'admin',
        },
        session: { id: 'management-session' },
      });
    }
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
    throw new Error(`测试禁止访问：${url.pathname}`);
  };
  const [{ default: App }, { router }, { eventBus }] = await Promise.all([
    import('../../src/App.vue'),
    import('../../src/router'),
    import('../../src/utils/event-bus'),
  ]);
  await router.replace('/users');
  const fixture = document.querySelector<HTMLElement>('#fixture');
  if (!fixture) {
    throw new Error('缺少测试容器');
  }
  fixture.style.height = '100vh';
  const app = createApp(App).use(createPinia()).use(router);
  app.mount(fixture);
  try {
    await router.push('/users');
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
    await router.push('/invitations');
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
      .querySelector<HTMLFormElement>('[data-slot="dialog-content"] form')
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
    await until(() => !document.querySelector('[data-slot="dialog-content"]'));
    assert(
      document.activeElement?.id === 'invitations-create',
      '邀请弹窗关闭恢复新增入口',
    );
    report('根邀请弹窗生成链接并恢复焦点');

    document
      .querySelector<HTMLElement>('tbody [data-slot="dropdown-menu-trigger"]')
      ?.click();
    await until(() =>
      Boolean(document.querySelector('[data-slot="dropdown-menu-content"]')),
    );
    [
      ...document.querySelectorAll<HTMLElement>(
        '[data-slot="dropdown-menu-item"]',
      ),
    ]
      .find((item) => item.textContent?.includes('删除链接'))
      ?.click();
    await until(() =>
      Boolean(document.querySelector('[data-slot="alert-dialog-content"]')),
    );
    document
      .querySelector<HTMLElement>(
        '[data-slot="alert-dialog-content"] [data-variant="destructive"]',
      )
      ?.click();
    await until(() =>
      Boolean(
        document.querySelector(
          '[data-slot="alert-dialog-content"] p.text-destructive',
        ),
      ),
    );
    assert(
      document
        .querySelector('[data-slot="alert-dialog-content"]')
        ?.textContent?.includes('模拟删除失败'),
      '后台删除失败保留确认框',
    );
    document
      .querySelector<HTMLElement>(
        '[data-slot="alert-dialog-content"] [data-variant="destructive"]',
      )
      ?.click();
    await until(
      () => !document.querySelector('[data-slot="alert-dialog-content"]'),
    );
    assert(deleteAttempts === 2, '后台删除重试只提交当前目标');
    report('后台删除接入统一确认框，支持失败反馈和重试');

    await router.push('/users');
    await until(() => Boolean(document.getElementById('users-create')));
    document.getElementById('users-create')?.click();
    await until(() => Boolean(document.getElementById('new-username')));
    eventBus.emit('account:show');
    assert(
      document.querySelectorAll('[data-slot="dialog-content"]').length === 1,
      '重复账号事件保持单例',
    );
    fill('new-username', 'test_user');
    fill('new-email', 'test@example.com');
    fill('new-password', 'test-password');
    await nextTick();
    document
      .querySelector<HTMLFormElement>('[data-slot="dialog-content"] form')
      ?.requestSubmit();
    await until(() => !document.querySelector('[data-slot="dialog-content"]'));
    assert(userCreates === 1, '账号弹窗只创建一次');
    document.getElementById('users-create')?.click();
    await until(() => Boolean(document.getElementById('new-username')));
    assert(
      document.querySelector<HTMLInputElement>('#new-password')?.value === '',
      '重新打开不保留密码',
    );
    await router.push('/invitations');
    await until(() => !document.querySelector('[data-slot="dialog-content"]'));
    report('根账号弹窗保持单例，重开清空密码，切页关闭');
  } finally {
    app.unmount();
    window.fetch = originalFetch;
    window.history.replaceState(null, '', originalPath);
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
