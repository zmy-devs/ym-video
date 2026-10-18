# 架构与迁移说明

## 当前阶段

本仓库由原 `ym-video` PC 项目改为 pnpm monorepo，并导入 `ym-video-app`。本阶段只统一源码位置、包管理、命令和说明文档，保留现有业务行为与直接依赖版本。

| 应用           | 状态                       | 责任                          |
| -------------- | -------------------------- | ----------------------------- |
| `apps/desktop` | 已有完整实现，迁移期间保留 | 原 Electron 桌面客户端        |
| `apps/mobile`  | 已导入原移动端实现         | Expo／React Native 安卓客户端 |
| `apps/web`     | 已实现独立 PC Web          | Vue 3 浏览器客户端            |
| `apps/api`     | 已实现本地可运行 API       | Fastify 登录、会话和资源代理  |
| `packages`     | 仅共享边界说明，无工作区包 | 后续跨端契约和纯业务逻辑      |

Web 已从桌面布局迁出，使用 shadcn-vue、Tailwind CSS 4 与 IndexedDB；不依赖桌面进程。API 已接入 Better Auth 登录、会话查询、退出和受限资源代理。云端用户偏好、观看历史和同步数据暂未设计。

## 源码归属与版本

- PC 原 `src`、`build`、`scripts`、Electron／Vite／TypeScript／Tailwind 配置和 `release-note.md` 迁入 `apps/desktop`，保留应用版本 `5.1.0`。
- 移动端从 `ym-video-app` 的 `eede28a043a0f2aca9caae92ce0c098923556da5` 导入跟踪文件，保留应用版本 `1.6.0` 和独立 `LICENSE`；未复制 `.git`，未合并其历史提交。
- 原独立移动仓库保留原样；后续源码以本仓库 `apps/mobile` 为统一开发位置。发布仓库仍沿用原桌面和移动仓库，发布迁移另行处理。
- 工作区包名分别为 `@ym-video/desktop`、`@ym-video/mobile`；产品显示名、Expo slug、深链、安卓包名及旧更新 URL 不依赖工作区包名。
- 根 package 是私有工程入口，版本 `0.0.0` 不代表任何客户端的发布版本。

## 工程管理

使用 pnpm workspace，不额外引入任务编排框架。根脚本通过 `pnpm --filter` 将命令委托给所属应用，运行目录为该应用根目录。

- Node 沿用 `22.21.1`，两个应用通过 `volta.extends` 继承根配置，pnpm 固定当前环境的 `11.20.0`。
- 全仓共用根 `pnpm-lock.yaml`，移除导入副本中的独立 workspace／锁文件。
- 锁文件由两个原锁文件合并，直接依赖 specifier 与解析版本保留。同一版本依赖包在原锁中存在不同的间接依赖记录时，统一采用原移动锁中的记录；这些版本均来自原有锁文件，没有执行包升级命令。后续再单独处理依赖升级和收敛。
- `nodeLinker: hoisted` 延续移动端策略；Metro 保留 `expo/metro-config`，利用 Expo 对 monorepo 的自动识别，不追加旧式 `watchFolders` 或手写 node_modules 搜索路径。
- 根 `.prettierrc`／`.prettierignore` 统一格式约定；各应用保留平台构建配置。原用户已有格式配置不做重写。
- 根 `.gitignore` 覆盖缓存、产物和本地环境；移动端原生目录与生成声明继续由 Expo 工具生成。

现有 `node-abi: latest` 覆盖规则仅迁到根 workspace，暂未调整。原构建许可按 pnpm 当前配置格式集中管理。桌面原生重建改为显式 `pnpm setup:desktop`，不再在整个工作区安装时执行，以免移动端开发被旧桌面原生编译工具链阻塞。缺少适配的预编译包时，这一步需要 Python 和 Visual Studio C++ Build Tools。

由于依赖提升到根目录，electron-builder 配置通过 Node 模块解析读取已安装的 Electron 版本，避免它只搜索应用本地 node_modules 时失败。桌面代码构建成功不等同于原生模块已准备好或已通过运行验证。

## 现有桌面端

技术栈：Electron、Vue 3、Vite、TypeScript、Vue Router、Pinia、Element Plus、Tailwind CSS 3、SCSS、hls.js、better-sqlite3、electron-store、ym-publish。

```text
Vue 管理页面 ──IPC request──> Electron 主进程 fetch ──> 资源接口
     │
     └──IPC openPlayer──> 播放窗口 ──> fetch m3u8／hls.js／video
                              │
                              └──IPC db:update──> 本地 SQLite
                                                   │
                                      saveHistory 消息同步管理窗口
```

- `src/main/bw`：管理与播放窗口的创建、显隐、生命周期和尺寸记录。
- `src/main/ipc`：资源请求、历史读写、窗口启动、更新下载与安装。
- `src/preload`：向页面暴露受控 IPC 与外部链接能力。
- `src/renderer/src/browser-windows/manager`：首页、分类、搜索、历史、设置及对应状态。
- `src/renderer/src/browser-windows/player`：hls.js 初始化、选集、播放控制和进度状态。
- `src/type`：当前桌面数据模型与 IPC 契约。

桌面端目前依赖主进程访问第三方接口。浏览器版需要另外处理跨域，不能仅把打包命令换成 Vite 后就视为迁移完成。

## 现有移动端

技术栈：Expo SDK 54、React 19.1、React Native 0.81.5、Expo Router、TypeScript、Valtio、NativeWind、Tailwind CSS 3、expo-sqlite、react-native-mmkv、react-native-video。

```text
Expo Router 页面 ──> services/api + utils/request ──> 资源接口
      │
      ├──> Valtio 状态 ──> expo-sqlite 历史／MMKV 配置
      │
      └──> views/player ──> fetch m3u8 ──> 缓存文件 ──> 原生 video
```

- `src/app`：路由与页面；`src/views/player`：播放器实现。
- `src/services`：资源 API、应用信息及本地存储适配。
- `src/stores`：影视、配置、历史、更新等状态；`src/utils`：平台工具。
- `app.config.js`、`metro.config.js`、`babel.config.js`、`eas.json` 保留在应用目录，以维持 Expo／EAS 的项目根定位。
- `nativewind-env.d.ts`、`expo-env.d.ts`、`.expo` 和原生工程不纳入 Git。首次运行类型检查前初始化 Expo／Metro 的生成类型。

## 目标架构

```text
Vue 3 Web ── 同域 API ──┐
                       ├── Cloudflare Workers ── Fastify ── 资源接口
Expo 安卓应用 ── HTTPS ─┘                             │
                                                     ├── Better Auth
Workers Static Assets ── Vue 构建产物                  │       │
                                                     └── Drizzle ── D1

客户端播放器 ───────────────────────────────> 可直连的视频资源
```

目标方案采用 Vue 3＋Vite、Fastify、Better Auth、Drizzle ORM 与 Cloudflare D1；Web 和 API 部署在 Cloudflare Workers，Web 使用 Static Assets 与 API 同域。API 已完成本地 Workers 运行链路和认证迁移，Web 使用 Vue Router／Pinia 与 shadcn-vue，安卓保持 RN。生产资源和部署尚未配置。

- Web 负责浏览器页面、播放、浏览器缓存与交互。
- API 按 `auth`、`user-data`、`proxy` 三个模块组织，分别负责登录与会话、用户数据保存与同步、第三方资源接口转发；服务端数据访问不下放到客户端。
- 安卓保持原生播放能力，逐步接入同一账号与历史 API。
- 共享包只承载真实复用的请求／响应契约和平台无关逻辑，不混入 Vue／RN 组件或平台存储。

后端运行在 Workers 的 Node.js HTTP 兼容层，不是传统 Node 常驻服务。当前 API 不声明 Fastify JSON Schema，路由在 Worker 初始化阶段编译，并已在 Wrangler／workerd 环境验证注册登录、会话及 D1 读写。认证会话存入 D1，Web 使用 Cookie，安卓使用 Better Auth Expo 插件及 SecureStore；原本的端内存储继续承担未登录历史与离线缓存。

后端模块、目录、D1 认证迁移和环境隔离见 [API 建设文档](../apps/api/README.md)。用户数据同步约束仍是后续工作。

## 下一阶段

1. 按用户安排清理无用依赖、分批升级，分别验证 Expo／RN 与 Vue／Electron 兼容性。
2. 验证 Fastify＋Better Auth＋D1 在 Workers 的最小运行链路，建立 Drizzle schema 与 D1 迁移，再迁移 Vue Web，替换 IPC、窗口切换及本地数据访问，逐源验证接口与完整播放链路。
3. 完成账号和历史同步：用户隔离、首次登录合并、本地缓存、离线重试、节流上报和多设备冲突处理；Web 稳定后再退出 Electron。

历史记录同步不能只依赖退出事件，也不能简单取“最大播放进度”当作最新状态，因为用户可能主动回看或切换集数。资源代理需要限制目标范围，媒体代理是否必要以实际兼容测试为准。

## 验证范围

结构调整需要覆盖冻结锁安装、工作区识别、两端类型检查、桌面构建、Expo 应用标识与 Metro 打包解析。具体执行结果和遗留问题见[迁移验证记录](monorepo-validation.md)；安卓真机／模拟器运行、EAS 云构建、远程 Release 和尚未实现的登录同步不计入本轮自动验证。

官方工程参考：[pnpm workspace 配置](https://pnpm.io/settings)、[Expo monorepo](https://docs.expo.dev/guides/monorepos/)、[EAS monorepo 构建](https://docs.expo.dev/build-reference/build-with-monorepos/)。
