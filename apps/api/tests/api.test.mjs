import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { convertV4MiniflareOptions, Miniflare, Response } from 'miniflare';
import { hashPassword } from 'better-auth/crypto';

let worker;
const outboundRequests = [];
const origin = 'https://web.example.com';

before(async () => {
  worker = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      scriptPath: fileURLToPath(new URL('../dist/worker.js', import.meta.url)),
      compatibilityDate: '2026-10-12',
      compatibilityFlags: ['nodejs_compat'],
      assets: {
        directory: fileURLToPath(new URL('../../web/dist/', import.meta.url)),
        run_worker_first: ['/api', '/api/*'],
        routerConfig: { has_user_worker: true },
        assetConfig: { not_found_handling: 'single-page-application' },
      },
      bindings: {
        BETTER_AUTH_SECRET: randomBytes(48).toString('base64url'),
        BETTER_AUTH_URL: 'https://api.example.com',
        WEB_ORIGINS: origin,
      },
      d1Databases: ['DB'],
      ratelimits: {
        AUTH_RATE_LIMITER: {
          namespace_id: '1001',
          simple: { limit: 60, period: 60 },
        },
        PROXY_RATE_LIMITER: {
          namespace_id: '1002',
          simple: { limit: 120, period: 60 },
        },
      },
      outboundService: async (request) => {
        outboundRequests.push(request);
        const keyword = new URL(request.url).searchParams.get('wd');
        if (keyword === 'redirect')
          return new Response(null, {
            status: 302,
            headers: { location: 'http://127.0.0.1/private' },
          });
        if (keyword === 'bad-json')
          return new Response('<html>upstream error</html>');
        if (keyword === 'failure')
          return new Response('unavailable', { status: 503 });
        if (keyword === 'large')
          return new Response('x'.repeat(2 * 1024 * 1024 + 1));
        if (keyword === 'timeout') {
          await new Promise((resolve) => setTimeout(resolve, 11_000));
        }
        return new Response(
          JSON.stringify({ class: [], list: [{ vod_id: 1 }], pagecount: 1 }),
          {
            headers: {
              'content-type': 'application/json',
              'set-cookie': 'upstream-secret=hidden',
            },
          },
        );
      },
    }),
  );
  const db = await worker.getD1Database('DB');
  const directory = new URL('../migrations/', import.meta.url);
  for (const file of (await readdir(directory))
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    const sql = await readFile(new URL(file, directory), 'utf8');
    const statements = sql
      .split('--> statement-breakpoint')
      .map((value) => value.trim())
      .filter(Boolean);
    await db.batch(statements.map((statement) => db.prepare(statement)));
  }
});

after(async () => {
  await worker?.dispose();
});

const request = (path, options = {}) =>
  worker.dispatchFetch(`https://api.example.com${path}`, options);
const post = (path, body, cookie) =>
  request(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
const getCookie = (response) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(';', 1)[0])
    .join('; ');

// 测试账号直接写入独立临时 D1，不依赖已经关闭的公开注册入口。
const createAccount = async (email, name, options = {}) => {
  // 为每个测试账号生成独立身份和随机密码。
  const id = randomUUID();
  const password = options.password ?? randomBytes(16).toString('hex');
  const hashed = await hashPassword(password);
  const now = Date.now();
  const db = await worker.getD1Database('DB');

  await db.batch([
    db
      .prepare(
        'INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt, username) VALUES (?, ?, ?, 0, ?, ?, ?)',
      )
      .bind(id, name, email, now, now, options.username ?? null),
    db
      .prepare(
        'INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(randomUUID(), id, 'credential', id, hashed, now, now),
  ]);

  return { email, password };
};

test('健康检查、JSON 404 与未登录身份校验', async () => {
  assert.deepEqual(await (await request('/api/v1/health')).json(), {
    status: 'ok',
  });
  assert.equal((await request('/api/v1/me')).status, 401);
  assert.equal((await request('/api/v1/not-found')).status, 404);
});

test('静态页面支持 SPA 深层路由，API 导航仍进入 Worker', async () => {
  for (const path of ['/home', '/player/baofeng/123']) {
    const response = await request(path, {
      headers: { 'sec-fetch-mode': 'navigate' },
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.match(await response.text(), /<div id="app"><\/div>/);
  }
  for (const path of ['/api', '/api/not-found']) {
    const response = await request(path, {
      headers: { 'sec-fetch-mode': 'navigate' },
    });
    assert.equal(response.status, 404);
    assert.match(response.headers.get('content-type'), /application\/json/);
  }
});

test('已有账号登录、用户隔离、错误密码与退出后的会话撤销', async () => {
  const account = await createAccount('first@example.com', 'First');
  const firstSignIn = await post('/api/auth/sign-in/email', account);
  assert.equal(firstSignIn.status, 200, await firstSignIn.clone().text());
  assert.ok(
    firstSignIn.headers
      .getSetCookie()
      .some((value) => /HttpOnly/i.test(value) && /Secure/i.test(value)),
  );
  const firstCookie = getCookie(firstSignIn);
  const first = await (
    await request('/api/v1/me', { headers: { cookie: firstCookie } })
  ).json();
  assert.equal(first.user.email, account.email);
  assert.equal(JSON.stringify(first).includes('token'), false);

  const secondAccount = await createAccount('second@example.com', 'Second');
  const secondSignIn = await post('/api/auth/sign-in/email', secondAccount);
  assert.equal(secondSignIn.status, 200, await secondSignIn.clone().text());
  const second = await (
    await request('/api/v1/me', {
      headers: { cookie: getCookie(secondSignIn) },
    })
  ).json();
  assert.notEqual(first.user.id, second.user.id);
  const spoofed = await (
    await request(`/api/v1/me?userId=${second.user.id}`, {
      headers: { cookie: firstCookie },
    })
  ).json();
  assert.equal(spoofed.user.id, first.user.id);

  const wrong = await post('/api/auth/sign-in/email', {
    email: account.email,
    password: 'wrong-password',
  });
  assert.equal(wrong.status, 401);
  const signIn = await post('/api/auth/sign-in/email', {
    email: account.email,
    password: account.password,
  });
  assert.equal(signIn.status, 200, await signIn.clone().text());
  const cookie = getCookie(signIn);
  const session = await (
    await request('/api/auth/get-session', { headers: { cookie } })
  ).json();
  assert.equal(session.user.id, first.user.id);
  assert.equal((await post('/api/auth/sign-out', {}, cookie)).status, 200);
  assert.equal(
    (await request('/api/v1/me', { headers: { cookie } })).status,
    401,
  );

  const db = await worker.getD1Database('DB');
  const stored = await db
    .prepare('SELECT password FROM account WHERE userId = ?')
    .bind(first.user.id)
    .first();
  assert.ok(stored.password);
  assert.notEqual(stored.password, account.password);
});

test('用户名或邮箱登录同一账号，支持六位密码并撤销退出会话', async () => {
  const account = await createAccount('username@example.com', 'Username', {
    username: 'test_admin',
    password: randomBytes(3).toString('hex'),
  });
  const signIn = await post('/api/auth/sign-in/username', {
    username: 'TEST_ADMIN',
    password: account.password,
  });
  assert.equal(signIn.status, 200, await signIn.clone().text());
  const cookie = getCookie(signIn);
  assert.ok(cookie);
  const session = await (
    await request('/api/auth/get-session', { headers: { cookie } })
  ).json();
  assert.equal(session.user.username, 'test_admin');
  assert.equal(session.user.email, account.email);

  const emailSignIn = await post('/api/auth/sign-in/email', account);
  assert.equal(emailSignIn.status, 200, await emailSignIn.clone().text());
  assert.equal((await emailSignIn.json()).user.id, session.user.id);

  for (const body of [
    { username: 'test_admin', password: 'incorrect' },
    { username: 'unknown_user', password: account.password },
  ]) {
    const failed = await post('/api/auth/sign-in/username', body);
    assert.equal(failed.status, 401);
    assert.equal((await failed.json()).code, 'INVALID_USERNAME_OR_PASSWORD');
    assert.equal(getCookie(failed), '');
  }

  assert.equal((await post('/api/auth/sign-out', {}, cookie)).status, 200);
  assert.equal(
    (await request('/api/v1/me', { headers: { cookie } })).status,
    401,
  );
});

test('网页与 Expo 均禁止公开注册，拒绝后不会创建账号', async () => {
  const email = 'blocked@example.com';

  for (const headers of [{ origin }, { 'expo-origin': 'ymvideo://' }]) {
    const response = await request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({
        email,
        name: 'Blocked',
        username: 'blocked_user',
        password: randomBytes(16).toString('hex'),
      }),
    });

    assert.equal(response.status, 400);
    assert.equal(
      (await response.json()).code,
      'EMAIL_PASSWORD_SIGN_UP_DISABLED',
    );
  }

  const db = await worker.getD1Database('DB');
  const account = await db
    .prepare('SELECT id FROM user WHERE email = ?')
    .bind(email)
    .first();

  assert.equal(account, null);
});

test('Expo 已有账号可以登录，拒绝未知来源、跨站退出与超大请求', async () => {
  const nativeAccount = await createAccount('native@example.com', 'Native');
  const nativeSignIn = await request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'expo-origin': 'ymvideo://',
    },
    body: JSON.stringify(nativeAccount),
  });
  assert.equal(nativeSignIn.status, 200, await nativeSignIn.clone().text());

  assert.equal(
    (
      await request('/api/v1/me', {
        headers: { cookie: getCookie(nativeSignIn) },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request('/api/v1/me', {
        headers: { origin: 'https://untrusted.example' },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request('/api/auth/sign-out', {
        method: 'POST',
        headers: {
          origin: 'https://untrusted.example',
          'content-type': 'application/json',
        },
        body: '{}',
      })
    ).status,
    403,
  );
  assert.equal(
    (await post('/api/auth/sign-in/email', { email: 'x'.repeat(20_000) }))
      .status,
    413,
  );
});

test('可信来源预检包含凭证支持，拒绝未知来源预检', async () => {
  const response = await request('/api/auth/sign-in/email', {
    method: 'OPTIONS',
    headers: { origin, 'access-control-request-method': 'POST' },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.equal(
    response.headers.get('access-control-allow-credentials'),
    'true',
  );
  assert.equal(
    (
      await request('/api/auth/sign-in/email', {
        method: 'OPTIONS',
        headers: { origin: 'https://untrusted.example' },
      })
    ).status,
    403,
  );
});

test('代理保留 JSON 格式，限制来源和参数，不转发双方凭证', async () => {
  const sources = await (await request('/api/v1/proxy/sources')).json();
  assert.equal(sources.sources.length, 7);
  const response = await request(
    '/api/v1/proxy/baofeng?ac=detail&wd=测试&pg=1',
    {
      headers: {
        cookie: 'private=secret',
        authorization: 'Bearer private-value',
      },
    },
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).list[0].vod_id, 1);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const forwarded = outboundRequests.at(-1);
  assert.equal(new URL(forwarded.url).hostname, 'bfzyapi.com');
  assert.equal(new URL(forwarded.url).searchParams.get('wd'), '测试');
  assert.equal(forwarded.headers.get('cookie'), null);
  assert.equal(forwarded.headers.get('authorization'), null);

  const count = outboundRequests.length;
  for (const query of [
    'url=http://127.0.0.1',
    'pg=0',
    'pg=1&pg=2',
    'ac=delete',
    'ids=1,abc',
    '__proto__=x',
  ]) {
    assert.equal(
      (await request(`/api/v1/proxy/baofeng?${query}`)).status,
      400,
      query,
    );
  }
  assert.equal((await request('/api/v1/proxy/unknown')).status, 404);
  assert.equal(outboundRequests.length, count);
});

test('代理拒绝重定向、无效 JSON、过大响应和上游错误', async () => {
  for (const [keyword, code] of [
    ['redirect', 'UPSTREAM_REDIRECT'],
    ['bad-json', 'UPSTREAM_INVALID_JSON'],
    ['large', 'UPSTREAM_TOO_LARGE'],
    ['failure', 'UPSTREAM_ERROR'],
  ]) {
    const response = await request(`/api/v1/proxy/baofeng?wd=${keyword}`);
    assert.equal(response.status, 502);
    assert.equal((await response.json()).code, code);
  }
});

test('代理在超时后返回 504', { timeout: 20_000 }, async () => {
  const response = await request('/api/v1/proxy/baofeng?wd=timeout');
  assert.equal(response.status, 504);
  assert.equal((await response.json()).code, 'UPSTREAM_TIMEOUT');
});

test('认证请求通过 Workers 限流 binding 返回 429', async () => {
  let limited;
  for (let count = 0; count < 70; count++) {
    const response = await request('/api/auth/get-session', {
      headers: { 'cf-connecting-ip': '198.51.100.42' },
    });
    await response.text();
    if (response.status === 429) {
      limited = response;
      break;
    }
  }
  assert.ok(limited);
  assert.equal(limited.headers.get('retry-after'), '60');
});
