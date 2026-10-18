# ym-video

视频聚合播放器 monorepo，统一管理桌面端和安卓端，后续迁移为 **Vue 3 Web＋Fastify API＋React Native 安卓应用**。目标后端采用 Better Auth 登录、Drizzle ORM 和 Cloudflare D1，Web 与 API 部署在 Cloudflare Workers。

已实现独立 PC Web：Vue 3＋shadcn-vue，支持浏览、搜索、播放、本地历史及已有账号通过用户名或邮箱登录。Web 业务页面要求登录，暂不开放注册。API 提供 Better Auth 会话和受限资源代理；旧桌面端与安卓端保留。云端历史和跨设备同步尚未实现。

## 目录

```text
ym-video/
├─ apps/
│  ├─ desktop/       # 现有 Electron＋Vue 3 桌面端，迁移期间保留
│  ├─ mobile/        # 从 ym-video-app 导入的 Expo＋React Native 应用
│  ├─ web/           # Vue 3＋shadcn-vue PC Web
│  └─ api/           # Fastify＋Better Auth API 与 Web 静态托管
├─ packages/         # 后续按实际需要提取共享契约和纯业务逻辑
├─ docs/
│  └─ architecture.md
├─ AGENTS.md         # 项目约定、技术栈与协作规则
├─ package.json      # 根命令入口
├─ pnpm-workspace.yaml
└─ pnpm-lock.yaml    # 全仓唯一依赖锁文件
```

架构、应用内部目录和迁移边界见 [架构文档](docs/architecture.md)。

API 的目录、接口、认证表和 Cloudflare 配置见 [API 建设文档](apps/api/README.md)。当前只在本地验证，生产资源尚未配置或部署。

本轮实际检查结果和已知问题见[迁移验证记录](docs/monorepo-validation.md)。

## 环境与安装

- Node.js：沿用 `22.21.1`，根目录保留 Volta 配置。
- pnpm：固定为当前使用的 `11.20.0`，见根目录 `packageManager`。
- 安卓开发另需 Android SDK、JDK 和设备／模拟器；云构建另需 EAS CLI 与 Expo 账号。
- 桌面运行需要为 Electron 准备 SQLite 原生模块；缺少适配的预编译包时，需要 Python 和 Visual Studio C++ Build Tools。

所有依赖都从仓库根目录安装：

```sh
pnpm install --frozen-lockfile
```

工作区使用 `nodeLinker: hoisted`，延续原移动端的安装方式。不要在应用目录重新创建独立锁文件或嵌套工作区。

## 常用命令

在仓库根目录运行：

| 命令                                | 用途                                                    |
| ----------------------------------- | ------------------------------------------------------- |
| `pnpm dev:desktop`                  | 启动现有 Electron 桌面端；当前开发脚本沿用 Windows 命令 |
| `pnpm dev:mobile`                   | Expo 生成原生项目并运行安卓应用                         |
| `pnpm typecheck` / `pnpm check`     | 检查 Web、桌面、移动和 API 的 TypeScript                |
| `pnpm typecheck:desktop`            | 仅检查桌面端主进程与 Vue 前端                           |
| `pnpm typecheck:mobile`             | 仅检查移动端 TypeScript                                 |
| `pnpm check:mobile`                 | 移动端类型检查与 Expo Doctor；Doctor 可能访问网络       |
| `pnpm build` / `pnpm build:desktop` | 构建现有桌面端，不生成安装包                            |
| `pnpm build:win`                    | 生成 Windows 安装包，输出到 `apps/desktop/dist/`        |
| `pnpm prebuild:mobile`              | 生成移动端原生项目                                      |
| `pnpm android` / `pnpm ios`         | 在对应平台构建并运行；iOS 本地构建需要 macOS            |
| `pnpm build:mobile`                 | 沿用现有 EAS 安卓云构建流程，需要联网与账号             |

Web 开发分别运行 `pnpm dev:api` 和 `pnpm dev:web`，访问 <http://localhost:5173>；首次配置 API 本地密钥后执行 `pnpm migrate:api`。Web 使用 `typecheck:web`、`build:web`、`preview:web`、`test:web` 验证，详情见 [Web 说明](apps/web/README.md)。根目录不再提供 `pnpm dev`；`pnpm build` 仍构建桌面端。

移动端首次独立执行类型检查前，应先启动 Expo／Metro，以生成项目原有的 `nativewind-env.d.ts` 等类型声明。这些文件和原生目录均不提交。

首次运行桌面端或 Electron 版本变化后，先执行 `pnpm setup:desktop`。桌面原生重建已从全仓安装中拆出，不影响移动端独立安装与开发。

## 发布与应用标识

工作区包名为 `@ym-video/desktop` 与 `@ym-video/mobile`，两端独立保留原版本号。应用显示名称仍为 `ym-video`，安卓包名、Expo slug／scheme、已有更新仓库和安装包名称均保持原值。

- 桌面端：`pnpm release:desktop`，读取 `apps/desktop/dist/ym-video-<版本>.exe`。
- 移动端：`pnpm release:mobile`，将构建所得 APK 放到 `apps/mobile/dist/ym-video-<版本>.apk` 后执行。
- 发布脚本从进程环境读取 `GH_TOKEN`、`GITEE_TOKEN`。EAS 项目 ID 由 `EAS_PROJECTID_YMVIDEO` 提供；不要把实际值提交到仓库。
- EAS CLI 通过根脚本运行时会自动切换到 `apps/mobile`。手动使用 EAS 时也应在该应用目录执行，保留该目录下的 `eas.json`。

原 `ym-video-app` 仓库保留；后续统一在本仓库的 `apps/mobile` 开发，避免两份源码分别修改。

## 下载

- 安卓：[GitHub](https://github.com/2514765066/ym-video-app/releases)、[Gitee](https://gitee.com/yxingyus/ym-video-app/releases)。
- Windows：[GitHub](https://github.com/2514765066/ym-video/releases)、[Gitee](https://gitee.com/yxingyus/ym-video/releases)。

## 免责声明

本软件仅供学习与技术交流使用，不得用于任何商业或非法用途。

本项目不提供任何视频内容或接口资源，所有数据均来自第三方来源。开发者对使用本软件所引发的任何后果、风险或法律责任不承担任何责任。请遵守当地法律法规及相关服务条款。
