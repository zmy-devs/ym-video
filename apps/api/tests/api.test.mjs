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
        'INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt, username, role) VALUES (?, ?, ?, 0, ?, ?, ?, ?)',
      )
      .bind(
        id,
        name,
        email,
        now,
        now,
        options.username ?? null,
        options.role ?? 'user',
      ),
    db
      .prepare(
        'INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(randomUUID(), id, 'credential', id, hashed, now, now),
  ]);

  return { email, password, id };
};

test('健康检查、JSON 404 与未登录身份校验', async () => {
  assert.deepEqual(await (await request('/api/v1/health')).json(), {
    status: 'ok',
  });
  assert.equal((await request('/api/v1/me')).status, 401);
  assert.equal((await request('/api/v1/not-found')).status, 404);
});

test('观看历史按账号隔离、逐集合并，并尊重删除和清空版本屏障', async () => {
  assert.equal((await request('/api/v1/history')).status, 401);

  const account = await createAccount('history@example.com', 'History');
  const signedIn = await post('/api/auth/sign-in/email', account);
  assert.equal(signedIn.status, 200);
  const cookie = getCookie(signedIn);
  const session = await (
    await request('/api/auth/get-session', { headers: { cookie } })
  ).json();
  const ownerId = session.user.id;

  const entry = (episode, currentTime) => ({
    id: 'source:movie',
    sourceId: 'source',
    vodId: 'movie',
    name: '测试影片',
    pic: 'https://image.example/poster.jpg',
    content: '',
    year: '',
    area: '',
    lang: '',
    category: '',
    remarks: '',
    episodes: [
      { label: '第 1 集', url: 'https://media.example/1.m3u8' },
      { label: '第 2 集', url: 'https://media.example/2.m3u8' },
    ],
    episode,
    progress: { [episode]: { currentTime, duration: 100 } },
    watchedAt: Date.now(),
  });
  const save = (
    id,
    at,
    selectedEpisode,
    currentTime,
    epoch = 'initial',
    generation = 'initial',
  ) => ({
    id,
    at,
    epoch,
    type: 'save',
    generation,
    entry: entry(selectedEpisode, currentTime),
  });
  const sync = (body, sessionCookie = cookie) =>
    request('/api/v1/history/sync', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin,
        cookie: sessionCookie,
      },
      body: JSON.stringify(body),
    });

  const otherAccount = await createAccount(
    'history-other@example.com',
    'Other',
  );
  const otherSignIn = await post('/api/auth/sign-in/email', otherAccount);
  const otherCookie = getCookie(otherSignIn);

  assert.equal(
    (await sync({ ownerId: session.user.id, operations: [] }, otherCookie))
      .status,
    409,
  );
  assert.equal(
    (await sync({ ownerId: ownerId, operations: [] }, '')).status,
    401,
  );

  const first = save('history-op-1', 100, 0, 20);
  const second = save('history-op-2', 200, 1, 35);
  const newerFirstEpisode = save('history-op-4', 180, 0, 24);
  const olderOffline = save('history-op-3', 150, 0, 12);
  const synced = await sync({
    ownerId,
    operations: [first, second, newerFirstEpisode, olderOffline],
  });
  assert.equal(synced.status, 200, await synced.clone().text());
  const snapshot = await synced.json();
  assert.equal(snapshot.records[0].entry.episode, 1);
  assert.equal(snapshot.records[0].entry.watchedAt, 200);
  assert.equal(snapshot.records[0].entry.progress['0'].currentTime, 24);
  assert.equal(snapshot.records[0].entry.progress['1'].currentTime, 35);

  const otherHistory = await (
    await request('/api/v1/history', { headers: { cookie: otherCookie } })
  ).json();
  assert.deepEqual(otherHistory.records, []);

  const retried = await sync({
    ownerId,
    operations: [first, second, newerFirstEpisode, olderOffline],
  });
  assert.equal(retried.status, 200);
  assert.equal(
    (await retried.json()).records[0].entry.progress['1'].currentTime,
    35,
  );

  // 同一账号两次独立登录共用 D1，服务端条件更新保留并发的逐集进度。
  const secondLogin = await post('/api/auth/sign-in/email', account);
  const concurrent = await Promise.all([
    sync({ ownerId, operations: [save('history-concurrent-0', 250, 0, 42)] }),
    sync(
      { ownerId, operations: [save('history-concurrent-1', 260, 1, 55)] },
      getCookie(secondLogin),
    ),
  ]);
  assert.ok(concurrent.every((response) => response.status === 200));
  const resumed = await request('/api/v1/history', {
    headers: { cookie: getCookie(secondLogin) },
  });
  assert.equal(resumed.headers.get('cache-control'), 'no-store');
  const resumedSnapshot = await resumed.json();
  assert.equal(resumedSnapshot.records[0].entry.progress['0'].currentTime, 42);
  assert.equal(resumedSnapshot.records[0].entry.progress['1'].currentTime, 55);

  // 所有操作先完成校验，无效批次不得部分写入。
  const invalid = await sync({
    ownerId,
    operations: [save('valid-before-invalid', 270, 0, 80), { type: 'save' }],
  });
  assert.equal(invalid.status, 400);

  const removed = {
    id: 'history-op-remove',
    at: 300,
    epoch: 'initial',
    type: 'remove',
    generation: 'initial',
    movieId: 'source:movie',
  };
  const stalePlayer = save('history-op-stale', 400, 0, 70);
  const deleted = await sync({ ownerId, operations: [removed, stalePlayer] });
  const deletedSnapshot = await deleted.json();
  assert.equal(deletedSnapshot.records[0].entry, null);
  assert.equal(deletedSnapshot.records[0].generation, removed.id);

  const clear = {
    id: 'history-op-clear',
    at: 500,
    epoch: 'initial',
    type: 'clear',
  };
  const cleared = await sync({ ownerId, operations: [clear] });
  const clearedSnapshot = await cleared.json();
  assert.equal(clearedSnapshot.epoch, clear.id);
  assert.deepEqual(clearedSnapshot.records, []);

  const reopened = save('history-op-reopened', 600, 0, 5, clear.id);
  const restored = await sync({ ownerId, operations: [reopened] });
  assert.equal(
    (await restored.json()).records[0].entry.progress['0'].currentTime,
    5,
  );
  // 清空前的迟到请求和重复清空都不能恢复旧历史或删除新记录。
  const late = await sync({
    ownerId,
    operations: [stalePlayer, clear, reopened],
  });
  const lateSnapshot = await late.json();
  assert.equal(lateSnapshot.epoch, clear.id);
  assert.equal(lateSnapshot.records[0].entry.progress['0'].currentTime, 5);

  // 同一个清空重复并发到达，也不能删除首个请求随后创建的新版本记录。
  const concurrentClear = {
    ...clear,
    id: 'history-clear-concurrent',
    epoch: clear.id,
  };
  const afterConcurrentClear = save(
    'history-after-concurrent-clear',
    700,
    0,
    9,
    concurrentClear.id,
  );
  const clearedTogether = await Promise.all([
    sync({ ownerId, operations: [concurrentClear, afterConcurrentClear] }),
    sync({ ownerId, operations: [concurrentClear] }),
  ]);
  assert.ok(clearedTogether.every((response) => response.status === 200));
  const finalSnapshot = await (
    await request('/api/v1/history', { headers: { cookie } })
  ).json();
  assert.equal(finalSnapshot.records[0].entry.progress['0'].currentTime, 9);
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

test('仅支持邮箱登录，禁用网页和 Expo 用户名登录，保留六位密码与会话撤销', async () => {
  const account = await createAccount('username@example.com', 'Username', {
    username: 'test_admin',
    password: randomBytes(3).toString('hex'),
  });
  const signIn = await post('/api/auth/sign-in/email', account);
  assert.equal(signIn.status, 200, await signIn.clone().text());
  const cookie = getCookie(signIn);
  assert.ok(cookie);
  const session = await (
    await request('/api/auth/get-session', { headers: { cookie } })
  ).json();
  assert.equal(session.user.username, 'test_admin');
  assert.equal(session.user.email, account.email);

  for (const headers of [{ origin }, { 'expo-origin': 'ymvideo://' }]) {
    for (const path of [
      '/api/auth/sign-in/username',
      '/api/auth/sign-in/username/',
    ]) {
      const blocked = await request(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify({
          username: 'TEST_ADMIN',
          password: account.password,
        }),
      });
      assert.equal(blocked.status, 404);
      assert.equal(getCookie(blocked), '');
    }
  }

  for (const body of [
    { email: account.email, password: 'incorrect' },
    { email: 'unknown@example.com', password: account.password },
  ]) {
    const failed = await post('/api/auth/sign-in/email', body);
    assert.equal(failed.status, 401);
    assert.equal((await failed.json()).code, 'INVALID_EMAIL_OR_PASSWORD');
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

// 每次操作使用独立测试 IP，功能回归不受前面限流测试的计数影响。
let adminRequestIndex = 0;
const manage = (path, method = 'GET', body, cookie) =>
  request(path, {
    method,
    headers: {
      origin,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      'cf-connecting-ip': `192.0.2.${++adminRequestIndex}`,
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
// 测试管理员均在隔离 D1 创建，不更改开发数据库。
const manager = async (label, role = 'admin') => {
  const account = await createAccount(`${label}@example.com`, label, {
    username: label,
    role,
  });
  const response = await manage('/api/auth/sign-in/email', 'POST', account);
  assert.equal(response.status, 200, await response.clone().text());
  return { ...account, cookie: getCookie(response) };
};

test('账号设置要求登录，用户名规范化判重且只修改当前账号', async () => {
  for (const [path, body] of [
    [
      '/api/auth/update-user',
      { username: 'settings_test', name: 'settings_test' },
    ],
    [
      '/api/auth/change-password',
      { currentPassword: 'old-password', newPassword: 'new-password' },
    ],
  ]) {
    assert.equal((await manage(path, 'POST', body)).status, 401);
  }

  const account = await manager('settings_owner', 'user');
  const other = await manager('settings_other', 'user');
  const update = (body) =>
    manage('/api/auth/update-user', 'POST', body, account.cookie);

  // 重复和非法用户名均不能改变原账号。
  const duplicate = await update({
    username: 'SETTINGS_OTHER',
    name: 'invalid',
  });
  assert.equal(duplicate.status, 400);
  assert.equal((await duplicate.json()).code, 'USERNAME_IS_ALREADY_TAKEN');
  for (const username of ['ab', 'x'.repeat(31), 'invalid name']) {
    assert.equal((await update({ username })).status, 400);
  }

  const unicodeUsername = await update({
    username: '煎bingguo子',
    name: '煎bingguo子',
  });
  assert.equal(
    unicodeUsername.status,
    200,
    await unicodeUsername.clone().text(),
  );

  assert.equal((await update({ role: 'admin' })).status, 400);
  const updated = await update({
    username: 'Settings.Changed',
    name: 'settings.changed',
    id: other.id,
  });
  assert.equal(updated.status, 200, await updated.clone().text());
  const me = await manage('/api/v1/me', 'GET', undefined, account.cookie);
  assert.equal(me.status, 200);
  const { user } = await me.json();
  assert.equal(user.id, account.id);
  assert.equal(user.username, 'settings.changed');
  assert.equal(user.name, 'settings.changed');
  assert.equal(user.role, 'user');
  const otherMe = await manage('/api/v1/me', 'GET', undefined, other.cookie);
  assert.equal((await otherMe.json()).user.username, 'settings_other');

  assert.equal(
    (
      await manage('/api/auth/sign-in/username', 'POST', {
        username: 'settings_owner',
        password: account.password,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await manage('/api/auth/sign-in/username', 'POST', {
        username: 'SETTINGS.CHANGED',
        password: account.password,
      })
    ).status,
    404,
  );
  assert.equal(
    (await manage('/api/auth/sign-in/email', 'POST', account)).status,
    200,
  );
});

test('修改密码验证旧密码与长度，更新当前会话并撤销其他会话', async () => {
  const account = await manager('settings_password', 'user');
  const other = await manager('settings_untouched', 'user');
  const secondLogin = await manage('/api/auth/sign-in/email', 'POST', account);
  const secondCookie = getCookie(secondLogin);
  const newPassword = ` ${randomBytes(16).toString('hex')} `;
  const change = (body) =>
    manage('/api/auth/change-password', 'POST', body, account.cookie);

  const invalid = await change({
    currentPassword: 'incorrect',
    newPassword,
    revokeOtherSessions: true,
  });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).code, 'INVALID_PASSWORD');
  for (const password of ['short', 'x'.repeat(129)]) {
    assert.equal(
      (
        await change({
          currentPassword: account.password,
          newPassword: password,
        })
      ).status,
      400,
    );
  }
  assert.equal(
    (await manage('/api/v1/me', 'GET', undefined, secondCookie)).status,
    200,
  );

  const changed = await change({
    currentPassword: account.password,
    newPassword,
    revokeOtherSessions: true,
  });
  assert.equal(changed.status, 200, await changed.clone().text());
  const currentCookie = getCookie(changed);
  assert.ok(currentCookie);
  assert.equal(
    (await manage('/api/v1/me', 'GET', undefined, currentCookie)).status,
    200,
  );
  assert.equal(
    (await manage('/api/v1/me', 'GET', undefined, account.cookie)).status,
    401,
  );
  assert.equal(
    (await manage('/api/v1/me', 'GET', undefined, secondCookie)).status,
    401,
  );
  assert.equal(
    (await manage('/api/v1/me', 'GET', undefined, other.cookie)).status,
    200,
  );
  assert.equal(
    (await manage('/api/auth/sign-in/email', 'POST', account)).status,
    401,
  );
  assert.equal(
    (
      await manage('/api/auth/sign-in/email', 'POST', {
        email: account.email,
        password: newPassword,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await manage('/api/auth/sign-in/email', 'POST', {
        email: account.email,
        password: newPassword.trim(),
      })
    ).status,
    401,
  );
});

test('管理接口拒绝匿名、普通用户和原生管理接口绕过', async () => {
  const ordinary = await manager('ordinary_manager', 'user');
  for (const [path, method, body] of [
    ['/api/v1/admin/users', 'GET'],
    ['/api/v1/admin/users', 'POST', {}],
    [`/api/v1/admin/users/${ordinary.id}`, 'PATCH', { banned: true }],
    [`/api/v1/admin/users/${ordinary.id}`, 'DELETE'],
    ['/api/v1/admin/invitations', 'GET'],
    ['/api/v1/admin/invitations', 'POST', {}],
    ['/api/v1/admin/invitations/missing', 'DELETE'],
  ]) {
    assert.equal((await manage(path, method, body)).status, 401);
    assert.equal(
      (await manage(path, method, body, ordinary.cookie)).status,
      403,
    );
  }
  const admin = await manager('route_manager');
  for (const path of [
    'create-user',
    'set-role',
    'ban-user',
    'remove-user',
    'list-users',
    'impersonate-user',
  ]) {
    assert.equal(
      (
        await manage(
          `/api/auth/admin/${path}`,
          path === 'list-users' ? 'GET' : 'POST',
          path === 'list-users' ? undefined : {},
          admin.cookie,
        )
      ).status,
      404,
    );
  }
  assert.equal(
    (await manage('/api/auth/admin%2Fcreate-user', 'POST', {}, admin.cookie))
      .status,
    404,
  );
});

test('管理员创建普通账号、规范化判重、验证输入和服务端分页', async () => {
  const admin = await manager('create_manager');
  const input = {
    username: 'Managed_User',
    email: 'Managed@Example.com',
    password: '123456',
    banned: true,
  };
  const response = await manage(
    '/api/v1/admin/users',
    'POST',
    input,
    admin.cookie,
  );
  assert.equal(response.status, 201, await response.clone().text());
  const { user } = await response.json();
  assert.equal(user.username, 'managed_user');
  assert.equal(user.email, 'managed@example.com');
  assert.equal(user.role, 'user');
  assert.equal(user.banned, false);
  // 只有管理员业务接口允许显式创建管理员，默认仍是普通用户。
  const createdAdmin = await manage(
    '/api/v1/admin/users',
    'POST',
    {
      username: 'managed_admin',
      email: 'managed_admin@example.com',
      password: '123456',
      role: 'admin',
      banned: true,
    },
    admin.cookie,
  );
  assert.equal(createdAdmin.status, 201);
  assert.equal((await createdAdmin.json()).user.role, 'admin');
  assert.equal(
    (
      await manage(
        '/api/v1/admin/users',
        'POST',
        {
          username: 'invalid_role',
          email: 'invalid_role@example.com',
          password: '123456',
          role: 'owner',
        },
        admin.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await manage(
        '/api/v1/admin/users',
        'POST',
        { ...input, email: 'other@example.com' },
        admin.cookie,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await manage(
        '/api/v1/admin/users',
        'POST',
        { ...input, username: 'other_user' },
        admin.cookie,
      )
    ).status,
    409,
  );
  for (const invalid of [
    { username: 'a' },
    { username: 'bad@name' },
    { email: 'invalid' },
    { password: '12345' },
    { password: 'x'.repeat(129) },
  ])
    assert.equal(
      (
        await manage(
          '/api/v1/admin/users',
          'POST',
          { ...input, ...invalid },
          admin.cookie,
        )
      ).status,
      400,
    );
  const signedIn = await manage('/api/auth/sign-in/email', 'POST', {
    email: input.email,
    password: input.password,
  });
  assert.equal(signedIn.status, 200);
  const db = await worker.getD1Database('DB');
  // 旧数据即使保留大写，新账号也不能通过大小写差异绕过判重。
  await createAccount('Legacy@Example.com', 'Legacy', {
    username: 'Legacy_User',
  });
  for (const duplicate of [
    { username: 'legacy_user', email: 'unique_legacy@example.com' },
    { username: 'unique_legacy', email: 'legacy@example.com' },
  ]) {
    assert.equal(
      (
        await manage(
          '/api/v1/admin/users',
          'POST',
          { ...duplicate, password: '123456' },
          admin.cookie,
        )
      ).status,
      409,
    );
  }
  const now = Date.now();
  await db.batch(
    Array.from({ length: 21 }, (_, index) =>
      db
        .prepare(
          "INSERT INTO user (id, name, username, email, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'user', ?, ?)",
        )
        .bind(
          randomUUID(),
          `paging_${index}`,
          `paging_${index}`,
          `paging_${index}@example.com`,
          now,
          now,
        ),
    ),
  );
  const first = await (
    await manage(
      '/api/v1/admin/users?search=PaGiNg_&page=1',
      'GET',
      undefined,
      admin.cookie,
    )
  ).json();
  const second = await (
    await manage(
      '/api/v1/admin/users?search=paging_&page=2',
      'GET',
      undefined,
      admin.cookie,
    )
  ).json();
  assert.equal(first.total, 21);
  assert.equal(first.items.length, 20);
  assert.equal(second.items.length, 1);
  assert.equal(second.pageSize, 20);
  assert.equal(
    new Set([...first.items, ...second.items].map((item) => item.id)).size,
    21,
  );
  assert.equal(
    (await manage('/api/v1/admin/users?page=0', 'GET', undefined, admin.cookie))
      .status,
    400,
  );
  const empty = await (
    await manage(
      '/api/v1/admin/users?search=%25',
      'GET',
      undefined,
      admin.cookie,
    )
  ).json();
  assert.equal(empty.total, 0);
});

test('停用撤销会话并拦截迟到会话，启用不恢复旧会话，删除级联清理', async () => {
  const admin = await manager('status_manager');
  const ordinary = await manager('status_user', 'user');
  const db = await worker.getD1Database('DB');
  const oldSession = await db
    .prepare('SELECT * FROM session WHERE userId = ?')
    .bind(ordinary.id)
    .first();
  assert.equal(
    (
      await manage(
        `/api/v1/admin/users/${ordinary.id}`,
        'PATCH',
        { banned: true },
        admin.cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await db
        .prepare('SELECT count(*) AS n FROM session WHERE userId = ?')
        .bind(ordinary.id)
        .first()
    ).n,
    0,
  );
  assert.equal(
    (await manage('/api/v1/me', 'GET', undefined, ordinary.cookie)).status,
    401,
  );
  assert.equal(
    (await manage('/api/auth/sign-in/email', 'POST', ordinary)).status,
    403,
  );
  // 模拟停用前已开始、停用后才落库的登录请求。
  await db
    .prepare(
      'INSERT INTO session (id, token, userId, expiresAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(
      oldSession.id,
      oldSession.token,
      ordinary.id,
      oldSession.expiresAt,
      oldSession.createdAt,
      oldSession.updatedAt,
    )
    .run();
  assert.equal(
    (await manage('/api/auth/get-session', 'GET', undefined, ordinary.cookie))
      .status,
    401,
  );
  assert.equal(
    (await manage('/api/v1/history', 'GET', undefined, ordinary.cookie)).status,
    401,
  );
  assert.equal(
    (
      await manage(
        `/api/v1/admin/users/${ordinary.id}`,
        'PATCH',
        { banned: false },
        admin.cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await manage('/api/v1/me', 'GET', undefined, ordinary.cookie)).status,
    401,
  );
  assert.equal(
    (await manage('/api/auth/sign-in/email', 'POST', ordinary)).status,
    200,
  );
  await db
    .prepare(
      "INSERT INTO user_history_meta (user_id, epoch, revision) VALUES (?, 'initial', 0)",
    )
    .bind(ordinary.id)
    .run();
  await db
    .prepare(
      "INSERT INTO user_history (user_id, id, generation, entry, stamp, episode_stamps, version, updated_at) VALUES (?, 'movie', 'initial', NULL, '{}', '{}', '{}', ?)",
    )
    .bind(ordinary.id, Date.now())
    .run();
  assert.equal(
    (
      await manage(
        `/api/v1/admin/users/${ordinary.id}`,
        'DELETE',
        undefined,
        admin.cookie,
      )
    ).status,
    200,
  );
  for (const [table, column] of [
    ['account', 'userId'],
    ['session', 'userId'],
    ['user_history', 'user_id'],
    ['user_history_meta', 'user_id'],
  ])
    assert.equal(
      (
        await db
          .prepare(`SELECT count(*) AS n FROM ${table} WHERE ${column} = ?`)
          .bind(ordinary.id)
          .first()
      ).n,
      0,
    );
  assert.equal(
    (
      await manage(
        `/api/v1/admin/users/${admin.id}`,
        'DELETE',
        undefined,
        admin.cookie,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await manage(
        `/api/v1/admin/users/${admin.id}`,
        'PATCH',
        { banned: true },
        admin.cookie,
      )
    ).status,
    409,
  );
  // 即使客户端保留已降权管理员的 Cookie，也不能操作最后一个管理员。
  await db
    .prepare("UPDATE user SET role = 'user' WHERE role = 'admin' AND id != ?")
    .bind(admin.id)
    .run();
  assert.equal(
    (
      await manage(
        `/api/v1/admin/users/${admin.id}`,
        'DELETE',
        undefined,
        ordinary.cookie,
      )
    ).status,
    401,
  );
  const stale = await manager('stale_manager');
  await db
    .prepare("UPDATE user SET role = 'user' WHERE id = ?")
    .bind(stale.id)
    .run();
  assert.equal(
    (
      await manage(
        `/api/v1/admin/users/${admin.id}`,
        'DELETE',
        undefined,
        stale.cookie,
      )
    ).status,
    403,
  );
});

test('管理员账号不读取或写入观看历史，也不创建历史元数据', async () => {
  const admin = await manager('no_history_manager');
  assert.equal(
    (await manage('/api/v1/history', 'GET', undefined, admin.cookie)).status,
    403,
  );
  assert.equal(
    (
      await manage(
        '/api/v1/history/sync',
        'POST',
        { ownerId: admin.id, operations: [] },
        admin.cookie,
      )
    ).status,
    403,
  );
  const db = await worker.getD1Database('DB');
  assert.equal(
    await db
      .prepare('SELECT user_id FROM user_history_meta WHERE user_id = ?')
      .bind(admin.id)
      .first(),
    null,
  );
});

test('并发停用或删除管理员时始终保留一个可用管理员', async () => {
  const db = await worker.getD1Database('DB');
  for (const method of ['PATCH', 'DELETE']) {
    const first = await manager(`race_first_${method.toLowerCase()}`);
    const second = await manager(`race_second_${method.toLowerCase()}`);
    await db
      .prepare(
        "UPDATE user SET role = 'user' WHERE role = 'admin' AND id NOT IN (?, ?)",
      )
      .bind(first.id, second.id)
      .run();
    const body = method === 'PATCH' ? { banned: true } : undefined;
    const results = await Promise.all([
      manage(`/api/v1/admin/users/${second.id}`, method, body, first.cookie),
      manage(`/api/v1/admin/users/${first.id}`, method, body, second.cookie),
    ]);
    assert.equal(
      results.filter((response) => response.status === 200).length,
      1,
    );
    assert.ok(
      results.every((response) => [200, 401, 409].includes(response.status)),
    );
    assert.equal(
      (
        await db
          .prepare(
            "SELECT count(*) AS n FROM user WHERE role = 'admin' AND coalesce(banned, 0) = 0",
          )
          .first()
      ).n,
      1,
    );
  }
});

test('邀请分页、注册原子性、并发单次使用与删除状态', async () => {
  const admin = await manager('invite_manager');
  const db = await worker.getD1Database('DB');
  const beforeInvalid = await db
    .prepare('SELECT count(*) AS n FROM invitation')
    .first();
  // 无效备注不能提前生成邀请，也不能写入数据库。
  for (const name of [undefined, null, 123, '', '   ', 'x'.repeat(81)]) {
    const response = await manage(
      '/api/v1/admin/invitations',
      'POST',
      { name },
      admin.cookie,
    );
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, 'INVALID_INVITATION_NAME');
  }
  assert.equal(
    (await db.prepare('SELECT count(*) AS n FROM invitation').first()).n,
    beforeInvalid.n,
  );
  const create = async (name = '  团队分享 Alpha  ') => {
    const response = await manage(
      '/api/v1/admin/invitations',
      'POST',
      { name },
      admin.cookie,
    );
    assert.equal(response.status, 201);
    const invitation = (await response.json()).invitation;
    assert.match(invitation.token, /^[A-Za-z0-9_-]{22}$/u);
    assert.equal(Buffer.from(invitation.token, 'base64url').length, 16);
    assert.equal(invitation.name, name.trim());
    return invitation;
  };
  const invitation = await create();
  const path = `/api/v1/invitations/${invitation.token}`;
  assert.deepEqual(await (await manage(path)).json(), { status: 'unused' });
  const searched = await (
    await manage(
      `/api/v1/admin/invitations?search=${encodeURIComponent(`https://web.example.com/invite/${invitation.token}`)}`,
      'GET',
      undefined,
      admin.cookie,
    )
  ).json();
  assert.equal(searched.total, 1);
  assert.equal(searched.items[0].id, invitation.id);
  assert.equal(searched.items[0].name, '团队分享 Alpha');
  const byName = await (
    await manage(
      '/api/v1/admin/invitations?search=aLpHa',
      'GET',
      undefined,
      admin.cookie,
    )
  ).json();
  assert.equal(byName.total, 1);
  assert.equal(byName.items[0].token, invitation.token);
  const input = {
    username: '煎bingguo子',
    email: 'invited@example.com',
    password: '123456',
    confirmPassword: '123456',
    role: 'admin',
  };
  assert.equal(
    (
      await manage(`${path}/register`, 'POST', {
        ...input,
        confirmPassword: 'different',
      })
    ).status,
    400,
  );
  assert.equal(
    (await manage(`${path}/register`, 'POST', input, admin.cookie)).status,
    409,
  );
  const collision = await manager('invite_collision', 'user');
  assert.equal(
    (
      await manage(`${path}/register`, 'POST', {
        ...input,
        email: collision.email,
      })
    ).status,
    409,
  );
  assert.deepEqual(await (await manage(path)).json(), { status: 'unused' });
  assert.equal(
    await db
      .prepare('SELECT id FROM user WHERE username = ?')
      .bind(input.username)
      .first(),
    null,
  );
  // 在凭据插入阶段强制失败，验证用户写入和邀请状态一起回滚。
  await db.exec(
    "CREATE TRIGGER fail_invited_account BEFORE INSERT ON account WHEN NEW.userId IN (SELECT id FROM user WHERE username = 'rollback_user') BEGIN SELECT RAISE(ABORT, 'test failure'); END",
  );
  assert.equal(
    (
      await manage(`${path}/register`, 'POST', {
        ...input,
        username: 'rollback_user',
        email: 'rollback@example.com',
      })
    ).status,
    500,
  );
  assert.equal(
    await db
      .prepare("SELECT id FROM user WHERE username = 'rollback_user'")
      .first(),
    null,
  );
  assert.deepEqual(await (await manage(path)).json(), { status: 'unused' });
  await db.exec('DROP TRIGGER fail_invited_account');
  const results = await Promise.all([
    manage(`${path}/register`, 'POST', input),
    manage(`${path}/register`, 'POST', {
      ...input,
      username: '竞争_user',
      email: 'competing@example.com',
    }),
  ]);
  assert.deepEqual(
    results.map((response) => response.status).sort(),
    [201, 409],
  );
  const success = await results
    .find((response) => response.status === 201)
    .json();
  assert.equal(success.user.role, 'user');
  assert.equal(
    (
      await db
        .prepare('SELECT count(*) AS n FROM user WHERE username IN (?, ?)')
        .bind(input.username, '竞争_user')
        .first()
    ).n,
    1,
  );
  const login = await manage('/api/auth/sign-in/email', 'POST', {
    email: success.user.email,
    password: input.password,
  });
  assert.equal(login.status, 200);
  assert.deepEqual(await (await manage(path)).json(), { status: 'used' });
  assert.equal(
    (
      await manage(`${path}/register`, 'POST', {
        ...input,
        username: 'later_user',
        email: 'later@example.com',
      })
    ).status,
    409,
  );
  await manage(
    `/api/v1/admin/users/${success.user.id}`,
    'DELETE',
    undefined,
    admin.cookie,
  );
  assert.deepEqual(await (await manage(path)).json(), { status: 'used' });
  assert.equal(
    (
      await db
        .prepare('SELECT used_by_id FROM invitation WHERE id = ?')
        .bind(invitation.id)
        .first()
    ).used_by_id,
    null,
  );
  const removed = await create('备注'.repeat(40));
  assert.notEqual(removed.token, invitation.token);
  await manage(
    `/api/v1/admin/invitations/${removed.id}`,
    'DELETE',
    undefined,
    admin.cookie,
  );
  assert.equal(
    (await manage(`/api/v1/invitations/${removed.token}`)).status,
    404,
  );
  assert.equal(
    (
      await manage(
        `/api/v1/invitations/${removed.token}/register`,
        'POST',
        input,
      )
    ).status,
    409,
  );
  // 旧版 64 位十六进制邀请继续支持查询、注册与单次核销。
  const legacyToken = randomBytes(32).toString('hex');
  await db
    .prepare('INSERT INTO invitation (id, token, created_at) VALUES (?, ?, ?)')
    .bind(randomUUID(), legacyToken, Date.now())
    .run();
  const legacyPath = `/api/v1/invitations/${legacyToken}`;
  const legacyList = await (
    await manage(
      `/api/v1/admin/invitations?search=${legacyToken}`,
      'GET',
      undefined,
      admin.cookie,
    )
  ).json();
  assert.equal(legacyList.items[0].name, '');
  assert.deepEqual(await (await manage(legacyPath)).json(), {
    status: 'unused',
  });
  assert.equal(
    (
      await manage(`${legacyPath}/register`, 'POST', {
        ...input,
        username: 'legacy_invited_user',
        email: 'legacy-invited@example.com',
      })
    ).status,
    201,
  );
  assert.deepEqual(await (await manage(legacyPath)).json(), { status: 'used' });
  const now = Date.now();
  await db.batch(
    Array.from({ length: 21 }, (_, index) =>
      db
        .prepare(
          'INSERT INTO invitation (id, token, created_at) VALUES (?, ?, ?)',
        )
        .bind(randomUUID(), `paging_token_${index}`, now),
    ),
  );
  const first = await (
    await manage(
      '/api/v1/admin/invitations?search=paging_token_',
      'GET',
      undefined,
      admin.cookie,
    )
  ).json();
  const second = await (
    await manage(
      '/api/v1/admin/invitations?search=paging_token_&page=2',
      'GET',
      undefined,
      admin.cookie,
    )
  ).json();
  assert.equal(first.total, 21);
  assert.equal(first.items.length, 20);
  assert.equal(second.items.length, 1);
  const preflight = await request('/api/v1/admin/users/id', {
    method: 'OPTIONS',
    headers: { origin, 'access-control-request-method': 'PATCH' },
  });
  assert.match(preflight.headers.get('access-control-allow-methods'), /PATCH/);
});
