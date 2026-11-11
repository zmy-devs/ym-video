# ym-video Admin

面向 PC 浏览器的管理应用，提供账号创建、启用、停用、删除和邀请管理。

## 技术栈

Vue 3、TypeScript、Vite、Vue Router、Pinia、shadcn-vue、Tailwind CSS 4。基础组件、主题与账号界面来自 `@ym-video/ui`，认证客户端与校验来自 `@ym-video/account`。

## 开发

在仓库根目录安装依赖并按 [API 说明](../api/README.md) 配置本地服务，然后分别运行以下命令。

```sh
pnpm dev:api
pnpm dev:admin
```

管理应用访问 <http://localhost:3001/admin/>，邀请码由管理端生成并复制给客户端注册页面使用。

管理员使用邮箱和密码登录。普通用户会看到账号权限提示，需要使用 Windows 或 Android 客户端访问影视功能。

## 构建

```sh
pnpm typecheck:admin
pnpm build:admin
pnpm preview:admin
```

产物位于 `apps/admin/dist/`，预览入口为 <http://localhost:4174/admin/>。生产环境与 Web、API 同域部署，通过 `/admin/` 访问；部署说明见 API README。

## 目录

- `src/layout` 维护管理导航与页面结构。
- `src/views` 维护登录、账号列表和邀请列表。
- `src/components/dialogs` 维护管理业务弹窗。
- `src/services` 维护浏览器会话与管理接口。
- `tests/browser` 使用模拟接口验证路由、业务交互和账号设置。
