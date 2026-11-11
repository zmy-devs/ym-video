# ym-video

视频聚合客户端，提供 Windows 桌面端和 Android 移动端。两端共用一套 Vue 页面与业务逻辑，由两个 Tauri 壳分别打包；Admin 管理端和 API Worker 独立部署。

## 项目结构

```text
apps/
  web/                         统一客户端页面、目录、播放器和历史客户端
  desktop/                     Windows Tauri 壳、原生能力和发布脚本
  mobile/                      Android Tauri 壳、设备插件和 APK 脚本
  admin/                       Admin 管理页面
  api/                         账号、历史、Admin 和邀请码 API
packages/
  ui/                          Web/Admin 共用基础组件、主题和账号界面
  account/                     账号客户端、校验和注册契约
  history/                     客户端/API 共用数据契约、校验与历史合并
  native-core/                 Tauri 网络、会话和安全存储
  mobile-controls/             Android 设备能力插件
```

## 安装

需要 Node.js 22.21.1、pnpm 11.20.0、Rust stable。Android 构建还需要 Android SDK/NDK 和 JDK 17+。

```sh
pnpm install --frozen-lockfile
```

## 启动

先启动本地 API：

```sh
pnpm migrate:api
pnpm dev:api
```

启动 Windows 桌面端：

```sh
pnpm dev:desktop
```

启动 Android 客户端：

```sh
pnpm dev:android
```

Admin 开发端：

```sh
pnpm dev:admin
```

## 常用脚本

| 命令                   | 用途                                         |
| ---------------------- | -------------------------------------------- |
| `pnpm dev:desktop`     | 启动 Windows Tauri 和统一客户端 desktop 模式 |
| `pnpm dev:android`     | 启动 Android Tauri 和统一客户端 mobile 模式  |
| `pnpm dev:admin`       | 启动 Admin 管理端                            |
| `pnpm dev:api`         | 启动本地 API Worker                          |
| `pnpm typecheck`       | 工作区类型检查                               |
| `pnpm test:api`        | API 集成测试                                 |
| `pnpm build:desktop`   | 构建 Windows 客户端                          |
| `pnpm build:android`   | 构建 Android APK                             |
| `pnpm build:api`       | 构建 API Worker 和 Admin 静态资源            |
| `pnpm release:desktop` | 发布 Windows 安装包和更新清单                |
| `pnpm release:android` | 发布 Android APK                             |

## 账号与资源请求

Admin 生成一次性邀请码，客户端 `/register` 页面使用邀请码完成注册。账号和观看历史由 API Worker 处理；目录、搜索、播放源和视频资源由客户端通过 Tauri 原生网络核心直接请求。

详细架构见 [`docs/client-refactor.md`](docs/client-refactor.md)。
