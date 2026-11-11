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

- `src/components/player`、`src/composables/player`：播放器界面、媒体控制、快捷键和手势。
- `src/components/movie-card`、`src/components/greeting.vue`：影片卡片、海报和问候。
- `src/lib`：影片解析、分类、内置播放源、问候规则和 HLS 清单处理。
- `src/services`：目录请求、媒体加载、本机历史队列和云端历史同步。
- `src/types.ts`、`src/types/player.ts`：客户端业务类型和播放器契约。

基础 UI、主题和账号界面由 `@ym-video/ui` 提供，账号客户端由 `@ym-video/account` 提供；`@ym-video/history` 与 API 共用数据契约和合并规则。

## 请求

账号和观看历史通过 API Worker 请求；目录、搜索、播放源和视频资源由 Tauri 原生网络核心直接请求第三方资源源。

Vite 开发服务只作为 Tauri WebView 的本地页面宿主，发布产物由 `apps/desktop` 和 `apps/mobile` 分别打包。
