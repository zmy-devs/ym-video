# ym-video 安卓端

从独立 `ym-video-app` 仓库导入的 Expo／React Native 应用，工作区包名为 `@ym-video/mobile`。

本轮只整理 monorepo，保留原有路由、原生播放器、本地 SQLite／MMKV、更新逻辑与版本号。后续接入与 Vue Web 共用的 Fastify API、账号和云端历史。

## 开发

在仓库根目录执行：

```sh
pnpm install --frozen-lockfile
pnpm dev:mobile
```

`dev:mobile` 沿用原有流程，先 `expo prebuild` 再运行安卓，需要 Android SDK、JDK 和设备／模拟器。仅运行 Metro 时可使用 `pnpm --filter @ym-video/mobile exec expo start`。

首次启动 Expo／Metro 会生成 NativeWind 和 Expo 类型声明，随后可运行 `pnpm typecheck:mobile`；`pnpm check:mobile` 另包含可能联网的 Expo Doctor。

## 构建与发布

- `pnpm build:mobile` 沿用现有 EAS 安卓云构建，需要 EAS CLI、账号与 `EAS_PROJECTID_YMVIDEO`。
- 手动运行 EAS 命令时进入本目录；`eas.json` 与 `app.config.js` 必须保留在这里。
- 工作区包名不影响应用标识：显示名／slug 仍为 `ym-video`，scheme 为 `ymvideo`，安卓包名为 `com.zhangmingyang.ymvideo`。
- 更新仓库仍使用 `ym-video-app`。发布前把 APK 放到本目录 `dist/ym-video-<版本>.apk`，再从根运行 `pnpm release:mobile`；发布凭据只读取进程环境。

原生工程、缓存、生成类型和 APK 不提交。不要在本目录创建单独的锁文件或 workspace 配置。

架构和全仓命令见[根 README](../../README.md)、[架构文档](../../docs/architecture.md)。

## 既有待办

以下为原仓库尚未处理的事项，保留以供后续评估，并非本次实现内容：

- 后台下载、网络问题处理。
- 调整 `hooks/useEpisode`、dialog／episode 样式、长按菜单与导航 UI。
- 云端存储与跨端历史同步，方案统一到后续 Fastify 服务。
