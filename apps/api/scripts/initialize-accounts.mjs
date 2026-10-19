import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';

// 仅操作本地 D1；初始密码必须由调用者环境提供，不保存到源码。
const password = process.env.YM_INITIAL_USER_PASSWORD;
if (!password || password.length < 6 || password.length > 128)
  throw new Error('请通过 YM_INITIAL_USER_PASSWORD 提供 6～128 位初始密码');
const require = createRequire(import.meta.url);
const wrangler = join(
  dirname(require.resolve('wrangler/package.json')),
  'bin/wrangler.js',
);
const cwd = fileURLToPath(new URL('../', import.meta.url));
// Wrangler 保留正常迁移和持久化路径，不直接修改 SQLite 文件。
const execute = (args) =>
  execFileSync(
    process.execPath,
    [wrangler, 'd1', 'execute', 'DB', '--local', '--json', ...args],
    { cwd, encoding: 'utf8' },
  );
const data = JSON.parse(
  execute([
    '--command',
    "SELECT id, username, email FROM user WHERE username IN ('admin', 'user') OR email IN ('admin@ym-video.local', 'user@ym-video.local')",
  ]),
);
const users = data[0].results;
const admin = users.find(
  (user) => user.username === 'admin' && user.email === 'admin@ym-video.local',
);
if (!admin)
  throw new Error('未找到现有 admin@ym-video.local，请先确认本地账号');
const existing = users.find(
  (user) => user.username === 'user' || user.email === 'user@ym-video.local',
);
if (
  existing &&
  (existing.username !== 'user' || existing.email !== 'user@ym-video.local')
)
  throw new Error('user 的用户名或邮箱被其他账号占用，未修改数据');
const id = randomUUID();
const now = Date.now();
const hashed = await hashPassword(password);
// 所有值均来自已校验的数据库结果或程序生成，并进行 SQL 字面量转义。
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sql = [
  `UPDATE user SET role = 'admin', updatedAt = ${now} WHERE id = ${quote(admin.id)};`,
  ...(existing
    ? []
    : [
        `INSERT INTO user (id, name, username, email, emailVerified, role, banned, createdAt, updatedAt) VALUES (${quote(id)}, 'user', 'user', 'user@ym-video.local', 0, 'user', 0, ${now}, ${now});`,
        `INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (${quote(randomUUID())}, ${quote(id)}, 'credential', ${quote(id)}, ${quote(hashed)}, ${now}, ${now});`,
      ]),
].join('\n');
const directory = await mkdtemp(join(tmpdir(), 'ym-video-accounts-'));
try {
  const path = join(directory, 'initialize.sql');
  await writeFile(path, sql);
  execute(['--file', path]);
  console.log(
    'admin 已设为管理员，user@ym-video.local 普通账号已就绪；已有账号密码保持不变。',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
