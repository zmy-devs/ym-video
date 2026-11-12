# 客户端统一页面与本地请求架构

## 目标结构

```text
一套 Vue 页面和业务逻辑
├── Desktop Tauri 壳
└── Android Tauri 壳
```

`apps/web` 保留为统一客户端前端源码。Windows 和 Android 共用路由、页面、Pinia store、播放器、账号和历史逻辑；两个 Tauri 工程分别负责原生窗口、平台权限、设备能力和构建。

## 平台常量

`apps/web/src/platform.ts` 暴露固定的 `platform`、`isDesktop` 和 `isMobile`。桌面构建使用 `vite --mode desktop`，Android 构建使用 `vite --mode mobile`。页面壳根据常量渲染，不通过窗口宽度决定平台。

桌面壳包含侧边栏、标题栏、窗口控件和桌面分类导航；移动壳包含顶部标题栏、底部导航、安全区和上下两层分类导航。页面内容、目录状态、搜索、历史和播放器保持共用。

## 请求边界

客户端通过 `request_api` 请求账号、会话和观看历史 API，通过 `request_resource` 直接请求内置或自定义资源源。API Worker 承担 Better Auth、账号管理、历史同步、Admin 和邀请码注册，并托管 Admin 静态入口。

目录资源不经过 API Worker。内置播放源保存在 `apps/web/src/lib/built-in-sources.ts`，目录解析和请求由 `apps/web/src/lib`、`apps/web/src/services` 维护，自定义播放源保存在本机存储中。

播放器位于 `apps/web/src/components/player/`，内部按 components、composables、services、utils 和类型组织。电影卡片、海报、问候和本机历史队列由 Web 直接维护；`packages/ui`、`packages/account` 保留 Web/Admin 共用能力，`packages/history` 保留客户端/API 共用的数据契约和合并规则。

## 邀请注册

Admin 生成一次性邀请码并提供复制入口。统一客户端的 `/register` 页面提交邀请码、邮箱、用户名和密码，服务端通过 `POST /api/v1/invitations/register` 原子创建普通用户并核销邀请码。

## 原生能力

两个 Tauri 工程共享 `packages/native-core`。移动播放器通过 `platform-capabilities.ts` 调用 Android 亮度、横屏、沉浸模式和保持屏幕常亮能力；桌面端保留窗口控制、单实例和更新能力。

## 构建入口

```text
pnpm dev:desktop
pnpm dev:android
pnpm build:desktop
pnpm build:android
pnpm build:api
```

`apps/web` 的 Vite 产物只作为两个 Tauri 壳的前端资源，API 构建只组装 Admin 静态资源和 Worker。
