# ym-video API

Cloudflare Workers API，负责 Better Auth、账号管理、观看历史、Admin 管理和一次性邀请码注册。Admin 页面继续由 Worker 的 `/admin/` 静态入口托管。

影视客户端由 Windows 和 Android Tauri 应用提供，目录、搜索、播放源和视频资源由客户端直接请求第三方资源源。

## 本地启动

```sh
pnpm migrate:api
pnpm dev:api
```

服务地址为 <http://127.0.0.1:8788>，健康检查地址为 `/api/v1/health`。Admin 开发端运行 `pnpm dev:admin`，访问 <http://localhost:3001/admin/>。

## 接口

| 接口 | 用途 |
| --- | --- |
| `GET /api/v1/health` | 健康检查 |
| `POST /api/auth/sign-in/email` | 邮箱密码登录 |
| `GET /api/auth/get-session` | 查询当前会话 |
| `POST /api/auth/sign-out` | 退出登录 |
| `POST /api/auth/update-user` | 修改用户名和展示名 |
| `POST /api/auth/change-password` | 修改密码 |
| `GET /api/v1/me` | 查询当前账号 |
| `GET /api/v1/history` | 读取观看历史 |
| `POST /api/v1/history/sync` | 同步观看进度、删除或清空历史 |
| `GET/POST /api/v1/admin/users` | 管理员查询／创建账号 |
| `PATCH/DELETE /api/v1/admin/users/:id` | 管理员停用、启用／删除账号 |
| `GET/POST /api/v1/admin/invitations` | 管理员查询／创建邀请码 |
| `DELETE /api/v1/admin/invitations/:id` | 删除邀请码 |
| `POST /api/v1/invitations/register` | 使用邀请码注册普通用户 |

邀请码由 Admin 生成，客户端注册时提交 `code`、邮箱、用户名、密码和确认密码；注册成功后邀请码立即失效。

## 构建与部署

```sh
pnpm build:api
pnpm --filter @ym-video/api run deploy
```

构建流程只组装 Admin 静态资源和 API Worker。生产环境配置位于 `apps/api/wrangler.jsonc`，数据库使用 D1，密钥通过 Wrangler Secret 管理。
