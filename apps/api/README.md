# ym-video API

运行在 Cloudflare Workers 上的 API 服务，提供邮箱登录、账号管理、邀请注册、观看历史同步和第三方资源代理，同时托管 Web 页面。

## 技术栈

TypeScript、Fastify 5、Better Auth、Drizzle ORM、Cloudflare Workers、D1、Wrangler。

## 本地启动

在仓库根目录安装依赖：

```sh
pnpm install --frozen-lockfile
```

复制 `apps/api/.env.example` 为 `apps/api/.env`，将 `BETTER_AUTH_SECRET` 替换为至少 32 个字符的随机密钥，然后运行：

```sh
pnpm migrate:api
pnpm dev:api
```

服务地址为 <http://localhost:8787>，健康检查地址为 <http://localhost:8787/api/v1/health>。启动命令会先构建 Web。

另开终端运行 `pnpm dev:web`，通过 <http://localhost:5173> 使用 Web 页面。

## 账号使用

Web 使用邮箱和密码登录。新账号由管理员在后台创建，或通过邀请链接注册，不提供公开注册入口。

本地已有 `admin@ym-video.local` 账号时，可运行以下 PowerShell 命令，将其设为管理员，并在缺少普通账号时创建 `user@ym-video.local`：

```powershell
$env:YM_INITIAL_USER_PASSWORD = '<6～128 位初始密码>'
pnpm --filter @ym-video/api run db:init:local
Remove-Item Env:YM_INITIAL_USER_PASSWORD
```

该脚本只操作本地数据库，不会重置已有账号密码；本地没有上述管理员账号时会提示错误。

## 接口

认证后的请求需携带登录接口返回的会话 Cookie。Web 与 API 使用同源地址。

| 接口                                       | 用途                               |
| ------------------------------------------ | ---------------------------------- |
| `GET /api/v1/health`                       | 健康检查                           |
| `POST /api/auth/sign-in/email`             | 邮箱密码登录                       |
| `GET /api/auth/get-session`                | 查询当前会话                       |
| `POST /api/auth/sign-out`                  | 退出登录                           |
| `POST /api/auth/update-user`               | 修改用户名和展示名                 |
| `POST /api/auth/change-password`           | 修改密码                           |
| `GET /api/v1/me`                           | 查询当前账号                       |
| `GET /api/v1/history`                      | 读取当前账号的观看历史             |
| `POST /api/v1/history/sync`                | 同步观看进度、删除或清空历史       |
| `GET /api/v1/proxy/sources`                | 获取平台播放源                     |
| `GET /api/v1/proxy/:sourceId`              | 查询平台源的分类、列表、搜索和详情 |
| `GET/POST /api/v1/admin/users`             | 管理员查询／创建账号               |
| `PATCH/DELETE /api/v1/admin/users/:id`     | 管理员停用、启用／删除账号         |
| `GET/POST /api/v1/admin/invitations`       | 管理员查询／创建邀请               |
| `DELETE /api/v1/admin/invitations/:id`     | 管理员删除邀请                     |
| `GET /api/v1/invitations/:token`           | 查询邀请状态                       |
| `POST /api/v1/invitations/:token/register` | 通过邀请注册                       |

代理只接受已配置的平台源，视频媒体由播放器直连。观看历史属于当前登录账号，管理员账号仅使用后台。

## 配置与部署

本地密钥保存在 `apps/api/.env`，生产密钥通过 Cloudflare Secret 设置。

| 配置                 | 用途                                         |
| -------------------- | -------------------------------------------- |
| `BETTER_AUTH_SECRET` | 认证密钥                                     |
| `BETTER_AUTH_URL`    | API 对外访问地址                             |
| `WEB_ORIGINS`        | 允许访问 API 的 Web 来源，多个地址以逗号分隔 |
| `DB`                 | D1 数据库 binding                            |

生产配置位于 `apps/api/wrangler.jsonc`，Web 与 API 共用 <https://ym-video.zhangmingyang.dpdns.org>，数据库为 `ym-video-auth`。

从仓库根目录运行：

```sh
pnpm --filter @ym-video/api exec wrangler secret put BETTER_AUTH_SECRET --env production
pnpm --filter @ym-video/api exec wrangler d1 migrations apply DB --remote --env production
pnpm --filter @ym-video/api run deploy
```

部署命令会构建 Web，并将网页和 API 一起发布到同一个 Worker。
