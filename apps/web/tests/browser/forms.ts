import { createApp, h, nextTick, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createAccountClient } from '@ym-video/account/client';
import { TooltipProvider } from '@ym-video/ui/components/tooltip';
import Login from '@ym-video/ui/account/login.vue';
import UsernameForm from '@ym-video/ui/account/username-form.vue';
import PasswordForm from '@ym-video/ui/account/password-form.vue';
import icon from '../../../../assets/icon.png';
import '../../src/styles/global.css';

// 断言实际表单和账号客户端之间的行为。
const assert: (value: unknown, message: string) => asserts value = (
  value,
  message,
) => {
  if (!value) {
    throw new Error(message);
  }
};

// 等待 schema 校验、账号请求和 Vue 渲染完成。
const until = async (check: () => boolean, message: string) => {
  const deadline = Date.now() + 10000;
  while (!check()) {
    assert(Date.now() < deadline, message);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await nextTick();
};

// 所有输入都经过真实 DOM 事件提交。
const fill = (id: string, value: string) => {
  const input = document.getElementById(id);
  assert(input instanceof HTMLInputElement, `${id} 输入框已挂载`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

// 提交真实表单，让 vee-validate 执行异步校验。
const submit = () => {
  const form = document.querySelector('form');
  assert(form, '表单已挂载');
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
};

// 运行共享登录、用户名和密码表单的完整提交流程。
const run = async () => {
  // 记录写请求；会话读取沿用真实 Better Auth 客户端。
  const writes: { path: string; body: unknown }[] = [];
  let user = {
    id: 'form-user',
    email: 'test@example.com',
    emailVerified: true,
    name: 'old_user',
    username: 'old_user',
    role: 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 用 HTTP 响应桩驱动真实账号客户端，首次登录模拟 503。
  const transport: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const path = new URL(request.url).pathname.split('/').at(-1) ?? '';
    if (request.method === 'POST') {
      const body: unknown = await request.json();
      writes.push({ path, body });

      if (path === 'email') {
        if (writes.filter((item) => item.path === 'email').length === 1) {
          return Response.json(
            { code: 'SERVICE_UNAVAILABLE', message: '暂时不可用' },
            { status: 503 },
          );
        }
        return Response.json({ token: 'form-token', user });
      }

      if (path === 'update-user') {
        assert(
          body &&
            typeof body === 'object' &&
            'username' in body &&
            typeof body.username === 'string',
          '用户名请求包含字段',
        );
        if (body.username === 'taken_user') {
          return Response.json(
            { code: 'USERNAME_IS_ALREADY_TAKEN', message: '用户名已占用' },
            { status: 400 },
          );
        }
        user = { ...user, username: body.username, name: body.username };
        return Response.json({ status: true });
      }

      if (path === 'change-password') {
        assert(
          body && typeof body === 'object' && 'currentPassword' in body,
          '修改密码请求包含当前密码',
        );
        if (body.currentPassword === 'wrong') {
          return Response.json(
            { code: 'INVALID_PASSWORD', message: '当前密码不正确' },
            { status: 400 },
          );
        }
        return Response.json({ token: 'form-token', user });
      }
    }

    return Response.json({
      user,
      session: {
        id: 'form-session',
        token: 'form-token',
        userId: user.id,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  };

  // 表单使用真实账号客户端，传输仅替换远端服务。
  const client = createAccountClient(`${location.origin}/api/auth`, transport);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: { render: () => null } },
      { path: '/home', name: 'home', component: { render: () => null } },
    ],
  });
  await router.push('/login');

  // 设置表单沿用真实受控 pending 和 saved 事件。
  const page = ref<'login' | 'username' | 'password'>('login');
  const pending = ref<'username' | 'password' | null>(null);
  let usernameSaved = 0;
  let passwordSaved = 0;
  const updatePending = (value: 'username' | 'password' | null) => {
    pending.value = value;
  };
  const app = createApp({
    render: () =>
      h(TooltipProvider, () => {
        if (page.value === 'login') {
          return h(Login, { client, role: 'user', homeRoute: 'home', icon });
        }
        if (page.value === 'username') {
          return h(UsernameForm, {
            client,
            pending: pending.value,
            'onUpdate:pending': updatePending,
            onSaved: () => usernameSaved++,
          });
        }
        return h(PasswordForm, {
          client,
          pending: pending.value,
          'onUpdate:pending': updatePending,
          onSaved: () => passwordSaved++,
        });
      }),
  }).use(router);
  app.mount('#fixture');

  try {
    // 无效字段应显示校验反馈，并阻止账号写请求。
    submit();
    await until(
      () => !!document.body.textContent?.includes('请输入密码'),
      '登录空字段显示 schema 错误',
    );
    assert(writes.length === 0, '登录校验失败不发请求');

    fill('login-email', ' test@example.com ');
    fill('login-password', ' test-pass ');
    await nextTick();
    submit();
    await until(
      () => router.currentRoute.value.path === '/home',
      '临时 503 后重试并完成登录',
    );
    const logins = writes.filter((item) => item.path === 'email');
    assert(logins.length === 2, '临时登录故障由重试库恢复');
    const loginBody = logins[1].body;
    assert(
      loginBody &&
        typeof loginBody === 'object' &&
        'email' in loginBody &&
        loginBody.email === 'test@example.com' &&
        'password' in loginBody &&
        loginBody.password === ' test-pass ',
      '邮箱规范化，密码保留原始输入',
    );

    // 用户名初始化、规范化和占用错误都通过真实组件验证。
    page.value = 'username';
    await nextTick();
    const username = document.getElementById('settings-username');
    assert(
      username instanceof HTMLInputElement && username.value === 'old_user',
      '用户名表单呈现当前账号初始值',
    );
    fill('settings-username', '!');
    await nextTick();
    submit();
    await until(
      () => !!document.body.textContent?.includes('用户名需为'),
      '无效用户名显示字段错误',
    );
    assert(
      !writes.some((item) => item.path === 'update-user'),
      '无效用户名不提交',
    );

    fill('settings-username', ' Mixed.User ');
    await nextTick();
    submit();
    await until(
      () => usernameSaved === 1 && pending.value === null,
      '用户名保存成功并刷新会话',
    );
    const usernameBody = writes.find(
      (item) => item.path === 'update-user',
    )?.body;
    assert(
      usernameBody &&
        typeof usernameBody === 'object' &&
        'username' in usernameBody &&
        usernameBody.username === 'mixed.user' &&
        'name' in usernameBody &&
        usernameBody.name === 'mixed.user',
      '用户名按 schema 去空格并转为小写',
    );

    fill('settings-username', 'taken_user');
    await nextTick();
    submit();
    await until(
      () => !!document.body.textContent?.includes('该用户名已被使用'),
      '服务端占用反馈绑定用户名字段',
    );
    assert(usernameSaved === 1, '用户名占用时不发送保存成功事件');

    // 密码关系错误先由 schema 拦截，凭据错误由账号服务返回。
    page.value = 'password';
    await nextTick();
    fill('settings-currentPassword', ' old-pass ');
    fill('settings-newPassword', 'fresh-pass');
    fill('settings-confirmPassword', 'different-pass');
    await nextTick();
    submit();
    await until(
      () => !!document.body.textContent?.includes('两次输入的密码不一致'),
      '密码确认关系由 schema 校验',
    );
    assert(
      !writes.some((item) => item.path === 'change-password'),
      '确认密码错误不发请求',
    );

    fill('settings-currentPassword', 'wrong');
    fill('settings-confirmPassword', 'fresh-pass');
    await nextTick();
    submit();
    await until(
      () => !!document.body.textContent?.includes('当前密码不正确，请重新输入'),
      '当前密码错误绑定对应字段',
    );
    assert(passwordSaved === 0, '凭据错误不报告保存成功');

    fill('settings-currentPassword', ' old-pass ');
    await nextTick();
    submit();
    await until(
      () => passwordSaved === 1 && pending.value === null,
      '修改密码成功',
    );
    const passwordBody = writes
      .filter((item) => item.path === 'change-password')
      .at(-1)?.body;
    assert(
      passwordBody &&
        typeof passwordBody === 'object' &&
        'currentPassword' in passwordBody &&
        passwordBody.currentPassword === ' old-pass ' &&
        'newPassword' in passwordBody &&
        passwordBody.newPassword === 'fresh-pass' &&
        'revokeOtherSessions' in passwordBody &&
        passwordBody.revokeOtherSessions === true,
      '密码原样提交，并撤销其他会话',
    );
    assert(
      [...document.querySelectorAll('input')].every(
        (input) => input.value === '',
      ),
      '保存成功后清空密码输入',
    );
  } finally {
    app.unmount();
  }
};

run()
  .then(() => {
    document.documentElement.dataset.result = 'passed';
    document
      .getElementById('status')
      ?.replaceChildren('账号表单校验、规范化与重试测试通过');
  })
  .catch((error: unknown) => {
    document.documentElement.dataset.result = 'failed';
    document
      .getElementById('status')
      ?.replaceChildren(
        error instanceof Error ? (error.stack ?? error.message) : String(error),
      );
  });
