# ym-video

视频聚合播放器，提供 PC Web、Windows 桌面端和安卓端，支持多播放源、搜索、在线播放和观看历史。Web 提供邮箱登录、邀请注册和跨设备历史同步，独立管理应用负责账号与邀请管理。

## 项目与技术栈

| 项目                             | 说明                               | 技术栈                                                             |
| -------------------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| [Web](apps/web/README.md)        | PC 浏览器应用                      | Vue 3、TypeScript、Vite、Pinia、shadcn-vue、Tailwind CSS 4、hls.js |
| [管理端](apps/admin/README.md)   | 浏览器账号与邀请管理               | Vue 3、TypeScript、Vite、Pinia、shadcn-vue、Tailwind CSS 4         |
| [API](apps/api/README.md)        | 账号、观看历史、资源代理与前端托管 | Fastify、Better Auth、Drizzle ORM、Cloudflare Workers、D1          |
| [桌面端](apps/desktop/README.md) | 内置 Web 页面的 Windows 桌面客户端 | Tauri 2、Rust、WebView2                                            |
| [安卓端](apps/mobile/README.md)  | Android 客户端                     | Expo、React Native、TypeScript、NativeWind、Valtio、SQLite、MMKV   |
| [共享包](packages/README.md)     | 影片与历史逻辑、Vue UI、账号组件   | TypeScript                                                         |

## 目录结构

```text
assets/
  icon.png                     Web、桌面端和安卓端共用的应用图标
apps/
  web/                         PC Web 页面、浏览器播放器与状态管理
  admin/                       浏览器管理页面、账号与邀请管理
  desktop/                     Windows 桌面应用
    src-tauri/                 Rust 原生能力与 Tauri 配置
    build/                     桌面端打包所需的生成资源
    docs/release-note.md        桌面端版本说明
    scripts/                   桌面构建、验证与发布脚本
  mobile/                      安卓原生页面、播放器与设备能力
  api/                         API 服务与前端静态资源托管
    migrations/                D1 数据库迁移
packages/
  ui/                          shadcn 基础组件、通用封装与主题
  account/                     共享账号客户端、表单与校验
  catalog/                     影片模型、采集站数据转换与播放线路解析
  history/                     观看历史类型、数据校验与进度合并
```

根目录的 `package.json` 提供统一脚本入口，`pnpm-workspace.yaml` 定义工作区，`pnpm-lock.yaml` 记录依赖版本。各应用目录维护自身的平台配置、资源和发布脚本。

三端共用图标源文件为 `assets/icon.png`，桌面构建会生成 Windows 安装图标。

## 安装

需要 Node.js 22.21.1、pnpm 11.20.0。所有命令均在仓库根目录执行：

```sh
pnpm install --frozen-lockfile
```

## 启动

### Web、Admin 与 API

先按 [API 说明](apps/api/README.md) 配置本地环境，首次运行时执行：

```sh
pnpm migrate:api
```

可使用 `pnpm dev` 同时启动三个开发服务，也可以在终端分别运行：

```sh
pnpm dev:api
```

```sh
pnpm dev:web
pnpm dev:admin
```

影视应用访问 <http://localhost:3000>，管理应用访问 <http://localhost:3001/admin/>。新用户通过管理员提供的邀请链接注册。管理员在影视 Web 登录后进入管理应用。

### 桌面端

桌面端开发模式连接本地 Web `http://localhost:3000`。先启动 API，再启动桌面端（自动启动 Web，无需单独运行 dev:web）：

```sh
pnpm dev:desktop
```

### 安卓端

准备 Android SDK、JDK 和设备或模拟器后运行：

```sh
pnpm dev:mobile
```

各端的详细用法与打包命令见上方项目说明。

## 常用脚本

以下命令均在仓库根目录执行：

| 命令                                                                                                                  | 用途                                                   |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `pnpm dev:web`、`pnpm dev:admin`、`pnpm dev:api`                                                                      | 分别启动 Web、Admin、API 开发服务                      |
| `pnpm dev:desktop`                                                                                                    | 启动桌面应用及 Web 开发服务                            |
| `pnpm dev:mobile`、`pnpm android`                                                                                     | 生成安卓原生工程并运行、运行已有安卓工程               |
| `pnpm migrate:api`                                                                                                    | 应用本地数据库迁移                                     |
| `pnpm typecheck`、`pnpm check`                                                                                        | 工作区类型检查                                         |
| `pnpm typecheck:web`、`pnpm typecheck:admin`、`pnpm typecheck:api`、`pnpm typecheck:desktop`、`pnpm typecheck:mobile` | 单应用类型检查                                         |
| `pnpm check:mobile`                                                                                                   | 移动端类型检查与 Expo 项目检查                         |
| `pnpm test:web`、`pnpm test:admin`、`pnpm test:api`、`pnpm test:desktop`                                              | Web、Admin、API、桌面端测试                            |
| `pnpm build:web`、`pnpm preview:web`                                                                                  | 构建 Web、预览 Web 产物                                |
| `pnpm build:admin`、`pnpm preview:admin`                                                                              | 构建、预览管理应用                                     |
| `pnpm build:api`                                                                                                      | 构建 Web 与 Admin、检查 API 类型并执行 Worker 部署预演 |
| `pnpm build`、`pnpm build:desktop`                                                                                    | 编译桌面应用与内置 Web                                 |
| `pnpm build:win`、`pnpm build:unpack`                                                                                 | 生成 Windows 安装包、未打包应用目录                    |
| `pnpm build:mobile`                                                                                                   | 使用 EAS 云构建安卓应用                                |
| `pnpm release:desktop`、`pnpm release:mobile`                                                                         | 上传对应应用的 Release 产物                            |

桌面打包和发布配置见[桌面端说明](apps/desktop/README.md)，安卓构建配置见[安卓端说明](apps/mobile/README.md)，数据库配置和部署方法见 [API 说明](apps/api/README.md)。

## 下载

- Windows：[GitHub](https://github.com/zmy-devs/ym-video/releases)、[Gitee](https://gitee.com/zmy-devs/ym-video/releases)。
- 安卓：[GitHub](https://github.com/zmy-devs/ym-video-app/releases)、[Gitee](https://gitee.com/zmy-devs/ym-video-app/releases)。

## 许可与免责声明

本项目采用 [PolyForm Noncommercial License 1.0.0](LICENSE)。允许协议规定的非商业使用、修改和分发；销售、收费服务等商业用途需另行获得著作权人授权。具体许可范围以协议原文为准，第三方材料遵循各自许可。

Required Notice: Copyright (c) 2025-2026 张铭洋

新协议不追溯撤销此前版本已按 MIT 许可授予的权利。使用本软件时不得从事非法活动。

本项目不提供任何视频内容或接口资源，所有数据均来自第三方来源。开发者对使用本软件所引发的任何后果、风险或法律责任不承担任何责任。请遵守当地法律法规及相关服务条款。
