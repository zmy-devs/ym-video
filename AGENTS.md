# 项目协作指南

默认用中文回答，结论优先、简洁直接。修改前查看受影响应用的配置和相邻实现，并保留已有未提交改动。

README 用于项目介绍、技术栈、安装启动和使用说明；实现约定放在本文件，测试记录和临时迁移过程不写入 README。

<!-- CODEGRAPH_START -->

## CodeGraph

在根目录存在 `.codegraph/` 时，理解或定位代码前先使用 CodeGraph：

- 优先使用 `codegraph_explore`；不可用时运行 `codegraph explore "<问题或符号>"`。
- 查询中指定文件或符号，以查看当前源代码和调用关系。
- 如果根目录没有 `.codegraph/`，跳过 CodeGraph，不主动创建索引。

<!-- CODEGRAPH_END -->

## 项目方向与边界

- 项目采用 pnpm workspace，应用位于 `apps/`，有真实跨端调用方的契约和纯业务逻辑才提取到 `packages/`。
- 产品方向为 Vue 3 Web、Fastify API、Expo／React Native 安卓端；各端使用 TypeScript。
- `apps/web` 是独立 PC 浏览器应用，使用 Vue 3、shadcn-vue 和 Tailwind CSS 4，不使用 Element Plus，也不做手机浏览器适配。
- `apps/desktop` 是 Electron 壳，Web 地址固定在 `src/main/utils/web.ts`，生产模式加载远程 HTTPS Web。桌面 Renderer 只放壳自身需要的本地页面；IPC 当前用于 Web 的桌面更新功能。
- `apps/mobile` 是 Expo／React Native 应用，原生页面、播放器和设备能力留在移动端。
- `apps/api` 是 Fastify Workers API；Web 静态资源和 API 使用 Cloudflare Workers 部署。
- 应用之间不使用相对路径直接引用对方源码。共享包使用 `@ym-video/*` 命名，并通过 `workspace:*` 声明依赖。
- Vue 与 React Native 组件、浏览器与原生播放器分别留在各自应用，不强行共享 UI 或平台能力。

## 目录职责

```text
apps/
  desktop/                     Electron 壳、更新 IPC、本地断网重试页
    src/main/                  主进程、窗口、导航与更新
    src/preload/               受限的 Electron IPC 桥接
    src/renderer/               桌面壳本地 Renderer 页面
    build/                      安装图标等打包资源
    docs/release-note.md        桌面端版本说明
    scripts/publish.ts          桌面 Release 发布脚本
  web/                          Vue 3 PC Web
  api/                          Fastify Workers API
  mobile/                       Expo／React Native 安卓应用
packages/                       跨应用共享包
```

根目录维护 workspace 入口和通用配置。Electron 配置、资源与版本说明归桌面应用；Expo、Metro 和 EAS 配置归移动应用。

## 当前技术栈

| 范围   | 技术                                                                  |
| ------ | --------------------------------------------------------------------- |
| 工程   | Node.js 22.21.1、pnpm 11.20.0、TypeScript、单一根锁文件               |
| 桌面   | Electron 43、electron-vite 5、electron-builder 26、electron-updater 6 |
| Web    | Vue 3、Vite、shadcn-vue、Tailwind CSS 4                               |
| API    | Fastify 5、Better Auth、Drizzle ORM、Cloudflare Workers、D1           |
| 移动端 | Expo SDK 54、React 19、React Native 0.81、Expo Router 6               |

精确依赖范围以各应用 `package.json` 为准，解析结果以根 `pnpm-lock.yaml` 为准。

## API 与数据

- API 接口、配置和运行说明见 [apps/api/README.md](apps/api/README.md)。Better Auth 使用 `/api/auth/*`，业务接口使用 `/api/v1/*`。
- Worker 使用 `nodejs_compat` 和 `cloudflare:node` HTTP 适配入口；需要兼容日期不早于 `2025-09-01`。
- D1 binding 命名为 `DB`；Drizzle 使用 D1 驱动，Better Auth 使用 SQLite provider。SQL 迁移通过 Drizzle Kit 生成、Wrangler 执行。
- Worker 根据会话确定用户身份；不使用客户端提交的用户 ID 授权。代理只允许服务端配置的目标，不向上游透传登录凭证。
- API 不声明 Fastify JSON Schema；新增 schema 或相关插件前先在 workerd 中验证。
- Web 使用会话 Cookie，观看历史使用 IndexedDB 并按现有账号同步逻辑写入 API。移动端按平台使用 expo-sqlite、MMKV 等本地存储。
- 旧桌面版本遗留的 SQLite 数据不迁移，也不由新版本自动删除。
- 密钥通过本地忽略的环境文件或部署平台 Secret 提供，不写入源码和文档；桌面发布令牌参考 `apps/desktop/.env.development.example`。

## 安装与常用命令

- 在仓库根目录使用 `pnpm install --frozen-lockfile`。所有应用共用根 `pnpm-workspace.yaml` 和 `pnpm-lock.yaml`，不要创建子锁文件或混用 npm／yarn。
- 根 `nodeLinker: isolated` 是安装策略；各应用通过自己的 `node_modules` 链接所声明的依赖，复用根目录 `node_modules/.pnpm` 存储，不为局部改动切换安装模型或引入 Turbo／Nx。
- 新依赖应声明在实际调用它的 workspace 应用中，不因依赖提升而省略直接依赖。
- 工作区包名与面向用户的应用名、安装包名、仓库 slug 分开维护；改包名时核对各平台 ID、scheme、更新源和安装包命名。

| 命令                                                                 | 用途                              |
| -------------------------------------------------------------------- | --------------------------------- |
| `pnpm dev:web`、`pnpm dev:api`                                       | 启动 Web、API 开发服务            |
| `pnpm dev:desktop`                                                   | 启动 Electron 桌面壳              |
| `pnpm dev:mobile`、`pnpm android`、`pnpm ios`                        | 移动端开发与设备运行              |
| `pnpm typecheck:web`、`pnpm typecheck:desktop`、`pnpm typecheck:api` | 单应用类型检查                    |
| `pnpm typecheck`、`pnpm check`                                       | 工作区类型检查                    |
| `pnpm test:web`、`pnpm test:api`                                     | Web 与 API 测试                   |
| `pnpm build:web`、`pnpm build:api`、`pnpm build:win`                 | 构建 Web、API、Windows 桌面安装包 |
| `pnpm build:mobile`                                                  | EAS 云构建，会访问外部服务        |
| `pnpm release:desktop`、`pnpm release:mobile`                        | 上传 Release 产物                 |

桌面开发连接本地 Web，生产模式连接代码中固定的 HTTPS 站点。发布脚本从 `apps/desktop/.env.development` 读取 `GITEE_TOKEN` 和 `GH_TOKEN`。真实发布、部署和 Git 提交按用户当次授权执行。

## 修改与验证

- 涉及前端代码且本地提供 `ym-rules` 时，按技能说明读取对应规范并完成自审；技能不是项目运行依赖。
- 遵守根 `.prettierrc`，只格式化本次涉及的文件。TypeScript 不新增逃避类型检查的 `any` 或忽略指令。
- 根据改动运行相关类型检查、测试或构建；说明实际执行的命令和结果。未运行设备、云构建、远程登录同步或发布时，不描述为已验证。
- 移动端首次安装后的 Expo 类型和原生目录由 Expo／Metro 生成；先初始化现有工具，不用宽泛声明掩盖类型错误。
- 保留无关工作区改动。删除或移动资源前核对所有引用，并验证文件移动完整性。

<!-- postman-cli:installation:start -->

Postman CLI is installed on this device, and can be used for API Engineering work.

<!-- postman-cli:installation:end -->
