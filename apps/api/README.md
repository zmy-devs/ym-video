# API 服务（待创建）

目标技术栈：**TypeScript＋Fastify＋Better Auth＋Drizzle ORM＋Cloudflare Workers＋D1**，为 Vue Web 与 Expo 安卓应用提供统一 HTTP API。

本目录目前只有设计文档，没有 `package.json`、服务代码或 Cloudflare 配置。选型已记录，依赖版本和运行兼容性在创建应用时验证；本次不安装依赖、不创建云资源、不部署。

## 技术选型

| 范围             | 方案                               | 用途                                                                    |
| ---------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| 开发语言与工具链 | TypeScript、根工作区 Node.js／pnpm | 编译、包管理和本地工程工具；生产运行时为 Workers                        |
| HTTP 框架        | Fastify                            | 路由、插件、资源接口和历史业务                                          |
| 认证             | Better Auth                        | 注册、登录、退出和会话管理                                              |
| 数据访问         | Drizzle ORM，D1 驱动               | 统一管理认证与业务表；Better Auth 使用 Drizzle 适配器的 SQLite provider |
| 云数据库         | Cloudflare D1                      | 保存账号、会话、观看历史和同步状态                                      |
| API 部署         | Cloudflare Workers                 | 通过 Node.js HTTP 兼容层运行 Fastify                                    |
| Web 部署         | Workers Static Assets              | 托管 Vue 3＋Vite 构建产物，与 API 同域                                  |
| 开发与部署工具   | Wrangler、Drizzle Kit              | Workers 本地环境、类型生成、SQL 生成与 D1 迁移                          |

Drizzle ORM 作为 D1 与 Better Auth 的数据库适配层。首期持久数据统一放 D1；后续确有头像、附件等文件存储需求时再使用 R2。暂不引入 PostgreSQL、Redis 或 KV。

## 部署与请求路径

```text
Vue 3 Web ── 同域 /api/* ──┐
                          ├── Cloudflare Workers ── Fastify ── 资源接口
Expo 安卓 ── HTTPS API ────┘                             │
                                                       ├── Better Auth
Workers Static Assets ── Vue 构建产物                    │       │
                                                       └── Drizzle ── D1

客户端播放器 ────────────────────────────────────────── 可直连的视频资源
```

- Web 与 API 保持独立源码目录，部署时由 API 的 Wrangler 配置引用 `apps/web/dist` 构建产物；这属于部署组合，不是跨应用引用源码。
- Web 静态资源交给 Workers Static Assets。`/api` 与 `/api/*` 优先进入 Worker，页面路由启用 SPA 回退；不存在的 API 返回 HTTP 错误，不回退成 `index.html`。
- Better Auth 挂载于 `/api/auth/*`；自有业务接口使用 `/api/v1/*`。认证接口保留 Better Auth 的请求和响应格式。
- 安卓访问相同 API。视频优先客户端直连，不默认把 m3u8、分片或完整视频流经 Worker／D1 存储和转发。

## Fastify 与 Workers 的运行约束

Workers 具有 Node.js 兼容能力，但不是完整的常驻 Node.js 进程，不能直接照搬普通服务器的启动方式。

- 开启 `nodejs_compat`，选择不早于 `2025-09-01` 的 `compatibility_date`，使用 `cloudflare:node` 的 `httpServerHandler` 或 `handleAsNodeRequest` 适配 Fastify。该日期之后，Node HTTP 服务端兼容能力随 `nodejs_compat` 默认开启；兼容日期在实现时固定。
- Fastify 的默认 JSON Schema 校验与响应序列化会使用 `new Function()`，而 Workers 禁止运行时动态求值。实现时采用构建期预编译的校验器／序列化器，或明确兼容 Workers 的替代实现；不能只打开 Node 兼容开关就认为迁移完成。
- D1 通过 Worker binding `DB` 访问；认证与数据访问从当前环境取得配置，不能把请求、当前用户或会话保存在全局可变状态中。服务初始化可复用，数据库 I/O 留在请求上下文内。
- 不使用本地 SQLite 文件、`better-sqlite3` 原生模块或本地磁盘作为后端持久层。日志输出到 Workers Logs，不依赖文件日志和常驻进程管理器。

创建应用后，先在 Wrangler／workerd 环境验证健康检查、路由校验、响应序列化、Better Auth 注册登录与 D1 读写，再扩展业务。普通 Node 下运行成功不能代替 Workers 验证；部署前还需核实密码哈希在目标 Workers 配额内可用。

## 登录与会话

- 首期按邮箱＋密码登录设计，由 Better Auth 管理密码哈希、会话建立与撤销。邮箱验证、找回密码和第三方登录另行确定，不将邮件发送服务视为已接入。
- Web 使用 Better Auth Vue 客户端和服务端会话 Cookie；生产 Cookie 启用 HTTPS、HttpOnly 和合适的 SameSite 策略，不在 localStorage 保存登录凭证。Web 与 API 同域，开发环境跨域时显式配置允许来源和凭证。
- 安卓使用 Better Auth Expo 插件及 `expo-secure-store` 保存会话凭证，沿用已有 `ymvideo` scheme；普通业务请求也需携带会话。不要将令牌存入 MMKV；接入时核实插件与现有 Expo SDK 54 的兼容性，不顺带升级 Expo。
- `trustedOrigins` 显式配置 Web 来源和 `ymvideo://` 深链；生产环境不放开任意来源。认证处理器正确转发状态码、响应体及多个 `Set-Cookie`，不得合并丢失 Cookie。
- 历史接口从服务端验证后的会话取得 `user.id`，查询、写入、删除均按用户隔离；客户端传入的用户 ID 不构成授权。退出登录后立即停止该账号的同步任务。

## D1 数据与历史同步

| 数据     | 规划                                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| 认证表   | 由所选 Better Auth 版本和插件生成 `user`、`session`、`account`、`verification` 等表；不自行重写密码或会话逻辑        |
| 观看历史 | `watch_history` 保存用户、资源来源、内容标识、线路／集数、进度、时长、服务端更新时间和记录版本                       |
| 同步状态 | 请求携带稳定操作 ID 与所基于的记录版本，用于离线重试去重与并发冲突检测；删除需保留版本／删除标记，避免旧设备恢复记录 |

- 观看历史按 `(user_id, source_id, content_id)` 唯一，按 `(user_id, updated_at)` 建列表索引；不同资源源的内容不默认视为同一条记录。
- 未登录时继续保留端内历史；首次登录执行明确的合并策略。登录后的本地队列按账号隔离，定期、暂停和切集时保存，不能只依赖关闭应用。
- 写入使用版本条件更新；冲突时获取云端新版本再按规则处理，不用“最大进度”或单纯客户端时间覆盖。重复上报应幂等，进度上报需节流，历史列表使用分页。
- D1 支持的事务模式与常规 SQLite 驱动不同；原子多语句按 D1 batch 能力设计，不直接依赖交互式事务或 ORM 的通用事务回调。Better Auth 适配器的事务配置必须与 D1 能力匹配。
- Better Auth 生成认证 schema，Drizzle Kit 生成 SQL，D1 迁移统一由 Wrangler 应用；只保留一条迁移执行链，不在服务启动或每次请求时自动建表。迁移文件纳入 Git，先验证本地／测试库再应用生产库。

## 服务职责与规划目录

资源模块接管原桌面 IPC 请求；只允许配置中的资源源，限制请求参数、超时和响应大小，并校验重定向目标，避免成为任意 URL 代理。历史模块负责用户隔离与同步规则。认证模块将认证流程交给 Better Auth。

以下均为后续创建应用时的目录规划，当前尚不存在：

```text
apps/api/
  src/
    worker.ts                 Workers 入口与 Node HTTP 适配
    app.ts                    Fastify 创建与路由注册
    lib/auth.ts               Better Auth、Drizzle 适配器与 Expo 插件
    db/
      index.ts                从 D1 binding 创建数据访问实例
      schema/auth.ts          Better Auth 生成的认证 schema
      schema/history.ts       历史与同步数据 schema
    modules/
      resources/              资源目录、分类、搜索和详情
      history/                历史读取、保存、合并与删除
  migrations/                 D1 SQL 迁移
  drizzle.config.ts           schema 与迁移生成配置
  wrangler.jsonc              Worker、静态资源、D1 与环境配置
  package.json                @ym-video/api
```

路由负责输入校验和 HTTP 响应，业务规则与数据库访问按实际复杂度拆分；不为每个简单接口机械创建多层文件。可供 Web／安卓复用的接口契约，出现真实调用方后再提取至 `packages/`。

## 环境与实施顺序

- 本地以 Wrangler 本地 D1 开发；测试和生产绑定不同 D1 数据库。`DB` 是 binding，不是连接字符串；环境绑定分别配置，不假定自动继承。
- `BETTER_AUTH_SECRET` 由 Cloudflare Secret 提供，`BETTER_AUTH_URL` 与允许的 Web 来源按环境配置；本地密钥放应用目录下已忽略的本地配置文件。CI 的 Cloudflare 凭证存入 CI Secret，不写入源码，也不暴露给客户端。
- 先完成 Workers 最小兼容验证与数据库迁移，再实现认证，最后接入资源和历史同步。实际创建应用时再添加工作区依赖、根开发／部署脚本；当前没有可执行的 `dev:api` 或部署命令。

## 官方参考

- [Workers Node HTTP 兼容与服务适配](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/)、[Workers JavaScript 运行限制](https://developers.cloudflare.com/workers/runtime-apis/web-standards/)。
- [Workers 静态资源路由](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)、[D1 数据库 API 与 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/)。
- [Better Auth Fastify](https://www.better-auth.com/docs/integrations/fastify)、[Drizzle 适配器](https://www.better-auth.com/docs/adapters/drizzle)、[Expo 集成](https://www.better-auth.com/docs/integrations/expo)。
- [Fastify 校验与序列化](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)。
