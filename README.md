# ym-video

视频聚合播放器，提供 PC Web、Windows 桌面端和安卓端，支持多播放源、搜索、在线播放和观看历史。Web 支持邮箱登录、邀请注册、账号管理和跨设备历史同步。

## 项目与技术栈

| 项目                             | 说明                                | 技术栈                                                             |
| -------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| [Web](apps/web/README.md)        | PC 浏览器应用                       | Vue 3、TypeScript、Vite、Pinia、shadcn-vue、Tailwind CSS 4、hls.js |
| [API](apps/api/README.md)        | 账号、观看历史、资源代理与 Web 托管 | Fastify、Better Auth、Drizzle ORM、Cloudflare Workers、D1          |
| [桌面端](apps/desktop/README.md) | 加载 Web 的 Windows 桌面客户端      | Electron 43、electron-vite 5、electron-updater 6                    |
| [安卓端](apps/mobile/README.md)  | Android 客户端                      | Expo、React Native、TypeScript、NativeWind、Valtio、SQLite、MMKV   |
| [共享包](packages/README.md)     | Web 与 API 共用的观看历史模型       | TypeScript                                                         |

## 安装

需要 Node.js 22.21.1、pnpm 11.20.0。所有命令均在仓库根目录执行：

```sh
pnpm install --frozen-lockfile
```

## 启动

### Web 与 API

先按 [API 说明](apps/api/README.md) 配置本地环境，首次运行时执行：

```sh
pnpm migrate:api
```

在两个终端分别启动 API 和 Web：

```sh
pnpm dev:api
```

```sh
pnpm dev:web
```

访问 <http://localhost:5173>，使用已有账号的邮箱和密码登录，或通过管理员提供的邀请链接注册。

### 桌面端

在 `apps/desktop/.env` 配置 `YM_VIDEO_WEB_URL` 后启动：

```sh
pnpm dev:desktop
```

### 安卓端

准备 Android SDK、JDK 和设备或模拟器后运行：

```sh
pnpm dev:mobile
```

各端的详细用法与打包命令见上方项目说明。

## 下载

- Windows：[GitHub](https://github.com/2514765066/ym-video/releases)、[Gitee](https://gitee.com/yxingyus/ym-video/releases)。
- 安卓：[GitHub](https://github.com/2514765066/ym-video-app/releases)、[Gitee](https://gitee.com/yxingyus/ym-video-app/releases)。

## 免责声明

本软件仅供学习与技术交流使用，不得用于任何商业或非法用途。

本项目不提供任何视频内容或接口资源，所有数据均来自第三方来源。开发者对使用本软件所引发的任何后果、风险或法律责任不承担任何责任。请遵守当地法律法规及相关服务条款。
