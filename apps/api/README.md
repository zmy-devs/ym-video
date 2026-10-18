# API 服务

这是运行在 Cloudflare Workers 上的 Fastify API，为 Vue Web 和 Expo 安卓端提供登录、会话和第三方资源接口代理。当前提供认证、代理和同域 Web 静态托管；观看历史由 Web 的 IndexedDB 保存，云端用户偏好、历史和跨设备同步等业务数据尚未实现。

## 技术栈

- TypeScript、Fastify 5、Cloudflare Node.js HTTP 兼容层
- Better Auth（用户名或邮箱＋密码、Cookie 会话、Expo 插件）
- Drizzle ORM、D1 SQLite 适配器
- Cloudflare Workers、D1、Rate Limit bindings
- Wrangler、Drizzle Kit、Miniflare（本地测试）

Fastify 的路由会在 Worker 初始化阶段编译，避免请求中动态生成代码；入口使用 `cloudflare:node` 的 `handleAsNodeRequest`。生产部署前仍需在目标账号验证密码哈希的资源配额。

## 目录

```text
apps/api/
├─ src/
│  ├─ worker.ts                 Worker 入口和 Fastify Node HTTP 适配
│  ├─ app.ts                    Fastify 实例、CORS、安全响应头和限流
│  ├─ env.ts                    BETTER_AUTH_* 和 WEB_ORIGINS 校验
│  ├─ errors.ts                 统一错误响应
│  ├─ db/
│  │  ├─ index.ts               D1 binding 创建 Drizzle 实例
│  │  └─ schema/auth.ts         Better Auth 生成的认证表
│  └─ modules/
│     ├─ auth/
│     │  ├─ options.ts           Better Auth 和 Expo 插件选项
│     │  ├─ auth.ts              D1 适配器和会话配置
│     │  ├─ routes.ts            /api/auth/*、/api/v1/me
│     │  └─ guard.ts             当前会话校验
│     └─ proxy/
│        ├─ targets.ts           允许的资源源白名单
│        ├─ service.ts            参数校验、超时、大小和 JSON 检查
│        └─ routes.ts             /api/v1/proxy/*
├─ migrations/                  D1 迁移（当前只有认证表）
├─ scripts/generate-auth-schema.mjs
├─ tests/api.test.mjs            Miniflare workerd 集成测试
├─ wrangler.jsonc               Workers、D1 和 Rate Limit 配置
├─ drizzle.config.ts
├─ tsconfig.json
└─ package.json
```

## 接口

Better Auth 原生接口统一挂载在 `/api/auth/*`，包括：

- `POST /api/auth/sign-up/email` 已禁用，网页和 Expo 均不能公开注册
- `POST /api/auth/sign-in/email` 登录并设置会话 Cookie
- `POST /api/auth/sign-in/username` 通过用户名登录，共用相同的会话与密码
- `GET /api/auth/get-session` 查询 Better Auth 会话
- `POST /api/auth/sign-out` 撤销当前会话

自有接口：

- `GET /api/v1/health` 健康检查
- `GET /api/v1/me` 登录后返回当前用户安全字段
- `GET /api/v1/proxy/sources` 返回可用资源源
- `GET /api/v1/proxy/:sourceId` 转发白名单资源源的 JSON 接口

代理只允许固定源和 `ac`、`pg`、`t`、`ids`、`wd` 参数，只发起 GET 请求；客户端不能传入目标 URL。服务端不转发客户端 Cookie、Authorization，也不下发上游 `Set-Cookie`。响应超过 2 MiB、上游跳转、无效 JSON、错误和 10 秒超时都会被拒绝。视频媒体仍建议客户端直连，不把媒体流经此 JSON 代理。

认证和代理分别使用 Workers Rate Limit binding；跨来源请求必须命中 `WEB_ORIGINS`，Cookie 请求启用凭证 CORS。生产环境的 `BETTER_AUTH_URL` 必须是 HTTPS，认证密钥只通过 Secret 提供。

## 本地运行

在仓库根目录执行：

先复制 `apps/api/.env.example` 为 `apps/api/.env`，填写至少 32 个字符的随机 `BETTER_AUTH_SECRET`，再执行：

```sh
pnpm install --frozen-lockfile
pnpm migrate:api
pnpm dev:api
```

`dev:api`、`build:api` 和部署脚本会先构建 Web，静态产物来自 `apps/web/dist`；API 路径优先执行 Worker，其他导航请求回退到 Web 入口。另开终端运行 `pnpm dev:web`，Web 开发访问 http://localhost:5173，Vite 将 `/api` 转发至本地 Worker；生产 Web 与 API 使用相同域名。

`apps/api/.env` 只用于本地 Wrangler，已被 Git 忽略；生产环境不读取它，而是通过 Cloudflare Secret 提供密钥。

常用检查：

```sh
pnpm typecheck:api
pnpm build:api
pnpm test:api
```

测试使用独立的临时 D1 和模拟上游，不会请求真实资源源。测试账号直接写入临时 D1，不依赖公开注册。`pnpm test:api` 会先执行 Workers dry-run 构建，再运行 11 组认证、注册禁用、CORS、代理、限流和静态页面路由测试。

## 迁移和部署

认证 schema 由当前 Better Auth 配置生成，Drizzle Kit 生成 SQL，Wrangler 应用迁移：

```sh
pnpm --filter @ym-video/api run db:schema
pnpm --filter @ym-video/api run db:generate
pnpm --filter @ym-video/api run db:migrate:local
```

当前迁移只创建 Better Auth 所需的 `user`、`session`、`account`、`verification` 四张表，并为 `user` 增加可空且唯一的 `username` 字段；旧账号仍可用邮箱登录。没有用户设置、历史或同步表。后续数据库结构确定后新增独立迁移，不在服务启动时自动建表。

部署前需要把 `wrangler.jsonc` 的 production D1 ID、域名和 Rate Limit namespace ID 换成真实资源，并设置密钥：

```sh
pnpm --filter @ym-video/api exec wrangler secret put BETTER_AUTH_SECRET --env production
pnpm --filter @ym-video/api run deploy
```

本仓库目前没有创建 Cloudflare 资源，也没有执行远程部署；配置中的 production 域名和 D1 ID 是占位值。`scripts/generate-auth-schema.mjs` 只在认证配置变化后手动运行，不参与 Worker 运行时和部署产物。

## 后续范围

前端完成后再确定用户数据表和接口：首次登录本地历史合并、按账号隔离、离线重试、定期进度上报和多设备冲突处理都不属于当前实现。业务接口必须始终从服务端会话取得 `user.id`，不能信任客户端传入的用户 ID。
