# 统一客户端前端

`apps/web` 是 Windows 桌面端和 Android 客户端共用的 Vue 页面与业务逻辑源码，不作为独立网页产品发布。

## 平台构建

平台由构建 mode 固定：

```sh
pnpm --filter @ym-video/web run dev:desktop
pnpm --filter @ym-video/web run dev:mobile
pnpm --filter @ym-video/web run build:desktop
pnpm --filter @ym-video/web run build:mobile
```

页面通过 `src/platform.ts` 读取 `desktop` 或 `mobile` 常量选择应用壳。目录、搜索、播放源、历史、账号和播放器逻辑由两端共用。

## 页面结构

- 桌面端使用侧边栏、标题栏、窗口控件和桌面分类导航。
- 移动端使用顶部标题栏、底部导航、安全区和上下两层分类导航。
- 页面路由、Pinia store、播放器和账号界面保持统一。

## 源码职责

- `src/components/player/`：播放器入口，以及内部 components、composables、services、utils 和类型。
- `src/components/movie-card`、`src/components/greeting.vue`：影片卡片、海报和问候。
- `src/layout/`：桌面与移动端标题栏、导航和应用壳。
- `src/lib/api.ts`：浏览器与 Tauri 共用的 API 请求入口。
- `src/utils/`：影片解析、分类、历史分组和问候规则。
- `src/constants/`：内置播放源。
- `src/services`：目录请求、本机历史队列和云端历史同步。
- `src/schemas/`：表单、上游响应和本地存储的 Zod 契约。
- `src/map/`：按更新、历史业务组织的状态文案。
- `src/types/`、`src/components/player/types.ts`：客户端公共类型和播放器契约。

基础 UI、主题和账号界面由 `@ym-video/ui` 提供，账号客户端由 `@ym-video/account` 提供；`@ym-video/history` 与 API 共用数据契约和合并规则。

## 请求

账号和观看历史通过 API Worker 请求；目录、搜索、播放源和视频资源由 Tauri 原生网络核心直接请求第三方资源源。

历史操作先写本机队列，网络失败由 `p-retry` 自动重试，云端确认后移除待上传操作。表单通过 vee-validate 和 Zod 统一管理字段校验。

Vite 开发服务只作为 Tauri WebView 的本地页面宿主，发布产物由 `apps/desktop` 和 `apps/mobile` 分别打包。

## 验证

`pnpm --filter @ym-video/web run test` 运行规则与数据契约测试；`pnpm --filter @ym-video/web run test:browser:mobile` 覆盖移动更新、播放源表单、长按与下拉刷新。浏览器回归需要 `CARGO_HOME/bin/msedgedriver.exe` 与本机 Edge 版本匹配。
