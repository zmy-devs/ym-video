# 项目协作指南

默认用中文回答，结论优先、简洁直接。修改前读取受影响应用的配置与相邻实现，保留用户已有未提交改动。

README 用于项目介绍、技术栈、安装启动和使用说明，不记录实现细节、迁移计划、调试过程或测试执行记录；开发协作约定放在 AGENTS.md。

<!-- CODEGRAPH_START -->

## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.

<!-- CODEGRAPH_END -->

## 当前阶段与技术决策

- 已将原 PC 项目和 `ym-video-app` 整理成 pnpm workspace；两端业务代码尚未重构。
- 最终方向是 **Vue 3 Web＋Fastify API＋Expo／React Native 安卓端**，各端使用 TypeScript；Web 与 API 部署于 Cloudflare Workers，API 使用 Node.js 兼容层。
- 当前可运行应用包括 `apps/desktop`、`apps/mobile`、`apps/api` 与 `apps/web`。Web 为独立 PC 浏览器应用，使用 Vue 3＋shadcn-vue＋Tailwind CSS 4，不使用 Element Plus，不做手机浏览器适配。
- Electron 在迁移期间保留于 `apps/desktop`；后续完成 Web 功能与资源兼容验证后，再移除桌面依赖和入口。
- API 已采用 Better Auth、Drizzle ORM、Cloudflare Workers 和 D1，实现邮箱密码登录、会话查询、退出和受限资源代理；当前只迁移认证必需表，用户偏好、观看历史和同步表等前端优化后再设计。Web 已接入账号、受限代理和浏览器本地历史；Web／API 尚未远程部署。
- 本次结构迁移不包含无用包清理、包版本升级和业务重构；后续按用户安排分阶段进行，不顺带升级 Expo／React Native 或批量格式化源码。

## 工作区与目录边界

```text
apps/
  desktop/                     @ym-video/desktop，现有 Electron 应用
    src/main/                  主进程、窗口、IPC、SQLite 和更新
    src/preload/               Electron 与 Vue 页面之间的桥接
    src/renderer/              Vue 页面与 hls.js 播放器
    src/type/                  桌面端现有数据与 IPC 类型
    build/                     图标等打包资源
    scripts/publish.mjs        旧桌面发布流程
  mobile/                      @ym-video/mobile，现有 Expo 应用
    src/app/                   Expo Router 页面路由
    src/views/player/          原生播放器、控件与状态
    src/components/            React Native 组件
    src/services/              API、SQLite、MMKV、应用信息
    src/stores/                Valtio 状态
    src/utils/                 请求、更新及其他工具
    src/assets/                图片等资源
    app.config.js              Expo 配置
    metro.config.js            Expo Metro 与 NativeWind 配置
    eas.json                   安卓云构建配置
    scripts/publish.mjs        旧移动端发布流程
  web/                         Vue 3＋shadcn-vue PC Web，IndexedDB 本地历史
  api/                         Fastify Workers API，已实现认证和资源代理
packages/                      共享包预留，当前仅 README
```

- 独立部署／运行的应用放在 `apps/`；有真实跨端调用方的契约与纯业务逻辑才提取到 `packages/`。
- 应用之间不直接相对路径引用源码。共享包使用 `@ym-video/*` 命名，通过 `workspace:*` 显式声明依赖并导出公共 API。
- Vue 与 RN 组件、浏览器与原生播放器分别留在各自应用，不强行共享 UI 或平台能力。
- 根目录只维护工程入口和通用配置；Electron 配置、资源、版本说明归桌面应用，Metro／Babel／EAS 配置归移动应用。

## 当前技术栈

| 范围             | 现有技术                                                                     |
| ---------------- | ---------------------------------------------------------------------------- |
| 工程             | Node.js 22.21.1、pnpm 11.20.0、单一根锁文件、TypeScript                      |
| 桌面外壳         | Electron 38、electron-vite 4、electron-builder 25                            |
| 桌面前端         | Vue 3.5、Vite 7、Vue Router 4、Pinia 2、Element Plus 2、Tailwind CSS 3、SCSS |
| 桌面数据与播放   | better-sqlite3 12、electron-store 11、hls.js 1、ym-publish                   |
| 移动端           | Expo SDK 54、React 19.1、React Native 0.81.5、Expo Router 6                  |
| 移动端状态与样式 | Valtio、NativeWind 4、Tailwind CSS 3                                         |
| 移动端数据与播放 | expo-sqlite、react-native-mmkv 4、react-native-video 6                       |
| Web              | Vue 3＋Vite＋shadcn-vue＋Tailwind CSS 4                                      |
| API              | Fastify 5＋Better Auth＋Drizzle ORM＋Cloudflare Workers＋D1                  |

精确依赖范围以各应用 `package.json` 为准，安装结果以根 `pnpm-lock.yaml` 为准。

## API 与 Cloudflare 约定

- API 的启动、配置与接口用法见 [API 说明](apps/api/README.md)。`apps/api` 和 `apps/web` 已可本地运行和测试，Web 静态产物与 API 使用同一 Worker；生产 Cloudflare 资源仍需另行配置。
- 后端规划按 `src/modules/auth`（登录与会话）、`user-data`（用户偏好、历史与进度）、`proxy`（第三方接口转发）三个模块组织。用户数据统一要求登录并按会话用户隔离；代理只转发服务端配置允许的目标，不将登录凭证透传给上游。
- Workers 开启 `nodejs_compat`，固定不早于 `2025-09-01` 的兼容日期，通过 `cloudflare:node` 的 Node HTTP 适配入口运行 Fastify；本地 Node／pnpm 是工程工具链，不代表生产使用常驻 Node 进程。
- API 不声明 Fastify JSON Schema，避免请求期动态校验／序列化；路由在 Worker 初始化阶段编译，入口用 `cloudflare:node` 适配 Node HTTP。新增 schema 或插件前必须在 workerd 中验证。
- Better Auth 挂载 `/api/auth/*`，业务接口使用 `/api/v1/*`。Web 使用会话 Cookie；安卓采用 Better Auth Expo 插件和 SecureStore，沿用 `ymvideo` scheme，核实与现有 Expo SDK 的兼容性。
- D1 binding 统一命名 `DB`；Drizzle 使用 D1 驱动，Better Auth 的 Drizzle 适配器使用 SQLite provider。账号、会话、历史保存在 D1，不将桌面的 `better-sqlite3` 或本地数据库文件搬入 Worker。
- 认证 schema 按 Better Auth 配置生成，SQL 由 Drizzle Kit 生成，迁移统一由 Wrangler 执行；D1 原子操作按 batch 能力设计，不假定支持通用交互式事务。测试与生产数据库隔离，密钥从 Worker Secret／已忽略的本地环境配置读取。
- Vue 构建产物由 Workers Static Assets 托管，`/api` 与 `/api/*` 优先执行 Worker，其他页面使用 SPA 回退；认证与历史响应不使用公共缓存。R2 等额外存储等出现真实需求后再引入。

## 安装、依赖与命令

- 从根目录执行 `pnpm install --frozen-lockfile`。使用根 `packageManager` 指定的 pnpm，应用通过 `volta.extends` 继承根 Node 版本。
- 全仓只有根 `pnpm-workspace.yaml` 与 `pnpm-lock.yaml`；不要在子应用创建锁文件、嵌套工作区或混用 npm／yarn 安装。
- 根 `nodeLinker: hoisted` 延续移动端现有策略。不要为本次结构迁移切换依赖安装模型或另加 Turbo／Nx 等任务工具。
- pnpm 的安装布局、构建许可和 `node-abi` 覆盖规则集中在根 workspace 配置。新增依赖按真实归属安装，例如 `pnpm --filter @ym-video/mobile add <包>`；不要因提升后能访问就省略直接依赖声明。
- 发布用的应用名称与工作区包名分开。改包名不能连带改变 `ym-video` 显示名、安卓 applicationId、Expo slug／scheme、更新仓库或安装包命名。

| 根命令                                                    | 行为                                          |
| --------------------------------------------------------- | --------------------------------------------- |
| `pnpm dev:desktop`                                        | 启动现有桌面端；根目录已移除 `pnpm dev`       |
| `pnpm dev:mobile`                                         | 原生项目生成后运行安卓，需要 Android 开发环境 |
| `pnpm dev:web` / `pnpm preview:web`                       | Web 开发／生产产物本地预览，API 单独启动      |
| `pnpm typecheck:web` / `pnpm build:web` / `pnpm test:web` | Web 类型、构建与针对性测试                    |
| `pnpm typecheck` / `pnpm check`                           | 已实现应用的类型检查（Web、桌面、移动、API）  |
| `pnpm typecheck:desktop` / `pnpm typecheck:mobile`        | 单端类型检查                                  |
| `pnpm check:mobile`                                       | 类型检查＋Expo Doctor，可能联网               |
| `pnpm build` / `pnpm build:desktop`                       | 桌面端类型检查与 electron-vite 构建           |
| `pnpm build:win` / `pnpm build:unpack`                    | 生成桌面安装包／未打包目录                    |
| `pnpm prebuild:mobile`                                    | 生成安卓／iOS 原生工程                        |
| `pnpm android` / `pnpm ios`                               | 对应平台原生构建与运行                        |
| `pnpm build:mobile`                                       | 执行现有 EAS 云构建，会访问外部服务           |
| `pnpm migrate:api` / `pnpm dev:api`                       | 应用本地 D1 认证迁移／启动 API                |
| `pnpm typecheck:api` / `pnpm build:api`                   | API 类型检查／Workers dry-run 构建            |
| `pnpm test:api`                                           | Miniflare workerd 集成测试                    |
| `pnpm release:desktop` / `pnpm release:mobile`            | 执行各端发布脚本，会写入远程 Release          |

移动端首次安装后的 `nativewind-env.d.ts`、Expo 路由类型等由 Expo／Metro 生成，缺失时应先初始化现有工具，不用宽泛声明掩盖类型错误。不要把云构建、发布或运行设备当作普通本地类型检查执行。

首次运行桌面端或 Electron 版本变化后执行 `pnpm setup:desktop`，单独准备 SQLite 原生模块。桌面原生重建从全仓 `postinstall` 拆出，以免移动端安装依赖桌面工具链。没有适配的预编译包时，这一步需要 Python 和 Visual Studio C++ Build Tools；不要通过升级 SQLite 或安装大型系统工具来偷偷扩大结构迁移范围。

## 数据流与后续迁移约束

- 当前桌面端资源请求：Vue `utils/request.ts` → IPC `request` → 主进程 `fetch`。浏览器不能直接继承这一能力，Web 迁移时接入 Fastify 资源接口，并逐源检查 CORS／HTTPS 兼容性。
- 当前桌面播放：网页 `fetch` 读取 m3u8，经本地字符串处理生成 Blob，再交给 hls.js 和 `<video>`。全屏、倍速和画中画使用浏览器 API。
- 当前移动播放：React Native 请求资源，将处理后的 m3u8 写入缓存文件，再交给 `react-native-video`；不能直接套用网页 Blob 播放逻辑。
- 当前桌面观看历史保存在本地 SQLite，设置和搜索历史使用 localStorage；移动端分别使用 expo-sqlite 和 MMKV。
- 云端历史必须通过服务端会话确定用户，查询和写入都按用户隔离；不能信任客户端传入的用户 ID 作为访问授权。
- 同步设计需要覆盖首次登录合并、未登录本地记录、定期和暂停／切集保存、离线重试及多设备版本冲突。不要直接复用“只在窗口关闭时保存”的桌面生命周期。
- 代理应限制目标与访问范围；视频尽量客户端直连，是否代理媒体资源应先验证真实需求。

## 修改与验证

- 如本地提供 `ym-rules` 技能，涉及前端代码时读取对应资料，完成后执行自审。技能文件不作为仓库可运行的前置依赖。
- 遵守根 `.prettierrc`：2 空格、分号、单引号、尾逗号、CRLF；既有文件只修改任务相关片段，不全仓格式化。
- TypeScript 优先；共享或复杂类型按真实职责组织，不为迁移目录机械提取类型，不新增逃避检查的 `any` 或忽略指令。
- 结构迁移至少核实 workspace 识别、冻结锁安装、各端类型检查、桌面构建及 Expo 配置／打包解析。对业务改动再补相关验证。
- 说明已执行命令和结果；未运行安卓设备、云构建或登录同步时不得描述为已验证。既有问题与本次新增问题分开记录。
- 源文件移动与复制需要验证完整性。引入移动端时不包含它的 `.git`、`node_modules`、构建缓存或密钥；原独立仓库保留，不删除。
- Git 提交、远程发布和部署按用户当次授权执行。密钥只从环境读取，不写入源码或文档；API 本地配置放在 `apps/api/.env`，生产配置使用 Cloudflare Secret。

<!-- postman-cli:installation:start -->

Postman CLI is installed on this device, and can be used for API Engineering work.

<!-- postman-cli:installation:end -->
