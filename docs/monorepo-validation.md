# Monorepo 迁移验证

验证日期：2026-10-17。范围包括工作区迁移和 API 登录／代理的最小实现；用户业务数据、依赖清理和升级留到下一阶段。

## 已通过

| 检查                                                        | 结果                                                                                                                                           |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm -r list --depth -1`                                   | 识别根工程及 `@ym-video/desktop`、`@ym-video/mobile`、`@ym-video/api`                                                                          |
| `pnpm install --frozen-lockfile`                            | 根安装成功；未更新锁定解析版本                                                                                                                 |
| `pnpm install --frozen-lockfile --offline`                  | 本地缓存齐全后，冻结锁离线安装成功                                                                                                             |
| `pnpm build:desktop`                                        | 主进程与 Vue 类型检查、主进程／preload／renderer 构建均通过                                                                                    |
| `pnpm install --frozen-lockfile --offline --trust-lockfile` | 根工作区冻结锁离线安装成功；API 依赖已纳入根锁文件                                                                                             |
| `pnpm typecheck:api`                                        | Wrangler 生成 Workers bindings 类型，API TypeScript 检查通过                                                                                   |
| `pnpm build:api`                                            | Workers dry-run 构建通过，未执行部署                                                                                                           |
| `pnpm test:api`                                             | Miniflare workerd 集成测试 8/8 通过：认证、会话撤销、CORS、代理边界、超时、响应大小和限流                                                      |
| `pnpm migrate:api`                                          | 本地 D1 认证迁移成功；迁移只包含四张 Better Auth 认证表                                                                                        |
| 本地 HTTP 烟测                                              | `GET /api/v1/health` 返回 200，未登录 `GET /api/v1/me` 返回 401                                                                                |
| Expo 配置解析                                               | 显示名／slug 为 `ym-video`、scheme 为 `ymvideo`、安卓包名为 `com.zhangmingyang.ymvideo`                                                        |
| Metro 配置解析                                              | 应用根目录正确指向 `apps/mobile`，NativeWind 生成声明正常                                                                                      |
| 安卓 JS 打包                                                | 在 `apps/mobile` 设置 `CI=1`、`EXPO_OFFLINE=1` 后执行 `expo export --platform android --output-dir .expo/monorepo-export`；1830 个模块成功打包 |
| 源码完整性                                                  | 桌面端 157 个、移动端 87 个源码／资源文件与迁移前哈希一致                                                                                      |
| 依赖保留                                                    | 两端直接依赖范围、原锁的直接解析版本均保持一致；间接重复记录的合并规则见架构文档                                                               |
| 原仓库与用户配置                                            | 原 `ym-video-app` 跟踪文件未改动；用户已有格式配置内容未改动；未引入嵌套 Git／锁文件／workspace                                                |
| 格式与路径                                                  | 本次新增文档和完整修改的配置通过 Prettier；文档相对链接有效；`git diff --check` 无问题                                                         |

## 原代码可复现的类型问题

`pnpm typecheck:mobile` 未通过，共 4 处：

| 位置                                                                                   | 问题                                      |
| -------------------------------------------------------------------------------------- | ----------------------------------------- |
| [loading.tsx:26](../apps/mobile/src/components/loading.tsx#L26)                        | `ViewStyle` 不接受 `animationDuration`    |
| [loading.tsx:62](../apps/mobile/src/components/loading.tsx#L62)                        | 同上                                      |
| [useVisible.ts:16](../apps/mobile/src/hooks/useVisible.ts#L16)                         | 定时器返回值 `Timeout` 与 `number` 不兼容 |
| [useControlStore.ts:15](../apps/mobile/src/views/player/stores/useControlStore.ts#L15) | 同上                                      |

将原移动端仓库的源码和 tsconfig 复制到临时目录，使用相同安装依赖及 NativeWind 生成声明进行对照检查，复现了相同的 4 处错误；本次未改动这些文件。根 `pnpm typecheck`／`pnpm check` 会包含移动端检查，因此当前不能视为全仓类型检查通过。这些问题留到后续依赖整理和业务重构阶段处理。

## 环境限制与未执行项

- Electron 的 SQLite 原生准备未通过：本机缺少 Visual Studio C++ Build Tools，`electron-builder install-app-deps` 无法编译当前 `better-sqlite3`。原生准备已改为根 `pnpm setup:desktop`，不会再阻塞全仓依赖安装；运行旧桌面客户端前仍需完成这一步。
- 未执行桌面运行验证、Windows 安装包生成、安卓真机／模拟器运行或 APK 原生编译。Metro 导出成功只代表 JS／资源解析成功。
- 未执行 EAS 云构建、远程发布或 Cloudflare 远程部署；Web 已在下文补充独立验证；云端用户历史和跨端同步尚未实现。API 的真实资源源请求未作为自动测试依赖，测试使用模拟上游。

本轮自审结果：API 本地运行链路和核心边界检查通过；桌面／移动端仍保留上述原有类型问题和环境限制。

## Web 剥离与 shadcn-vue 验证（2026-10-17）

本轮新增独立 PC Web，保留桌面和移动端源码及直接依赖版本，未提交 Git、发布 Release 或部署远程 Worker。Web、API 的使用方式见各应用 README。

### 工程检查

| 检查           | 实际结果                                                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 冻结锁安装     | pnpm install --frozen-lockfile --offline --trust-lockfile --config.supportedArchitectures.os=win32 --config.supportedArchitectures.cpu=x64 通过。在线安装也已使用同样的冻结锁与平台参数完成。 |
| 旧应用依赖     | 与本轮开始前的锁文件逐项比较，desktop、mobile、api 的 importer 完全相同；Web 单独使用 Tailwind 4.3.3，旧两端仍使用原版本。                                                                    |
| Web 类型与构建 | pnpm typecheck:web、pnpm build:web 通过；额外 noUnusedLocals／noUnusedParameters 检查通过。播放器含 hls.js 的异步块约 549 kB，Vite 有体积提示，不影响构建。                                   |
| Web 针对性测试 | pnpm test:web 6/6：多源标识、播放线路、相对地址、过滤清单，以及存储拒绝访问和损坏设置。                                                                                                       |
| 桌面回归       | pnpm build:desktop 通过。未运行 Electron；原生 SQLite 准备限制仍见上文。                                                                                                                      |
| API 与静态托管 | pnpm test:api 9/9：原认证／代理测试及新增 SPA 深层路由、/api 导航优先进入 Worker；包含 Web 构建、API 类型检查和 Worker dry-run。                                                              |
| 本地 D1        | pnpm migrate:api 通过，无新增数据库表或迁移。                                                                                                                                                 |
| Web 平台隔离   | 源码、应用依赖与构建产物检索未发现 Element Plus、Electron、IPC、旧桌面源码别名或跨应用源码引用。                                                                                              |
| 格式与自审     | 本轮文件按根 Prettier 配置处理；git diff --check 通过；impeccable detect 返回空结果。按 ym-rules 完成自审，修复切源／切集竞态、旧异步回写及本地页面被 API 错误遮挡。                          |

普通安装曾被现有 API 的 Wrangler／Miniflare 发布不足一天策略拒绝；本轮使用 trust-lockfile 安装既有锁定版本，没有降低仓库的发布年龄策略。平台参数仅用于本机安装，没有修改 workspace 的支持平台配置。

### Edge 实际交互与播放

已验证首页、分类、搜索与搜索历史、加载更多（20 条追加为 40 条）、快速切源后源 ID 与结果一致、空搜索、设置入口、注册／登录／错误密码／退出、本地历史右键删除、播放页刷新、返回、快速切集、倍速、音量和滑块。测试账号仅存在本地 D1，未使用真实账号凭证。

播放页在约 60 秒暂停后刷新，恢复至该进度并继续到 69 秒；从旧影片恢复后，选集保持在第 3 集。旧暴风影片 41491 的上游清单返回 404，页面显示媒体错误及重试／换源入口。茅台详情接口曾短暂失败，后续请求成功并完成播放；接口失败没有导致空白页面。

逐源抽样结果如下。清单 HTTP 200，分片 206；返回的 Access-Control-Allow-Origin 均为 \*。茅台、豆瓣样本密钥 206，极速样本密钥 200，其余抽样媒体未使用密钥。主清单、子清单、分片和密钥由浏览器直连上游。

| 源 ID   | 浏览器解码样本影片 ID | Edge 实际媒体尺寸 | 已观察到的进度      |
| ------- | --------------------- | ----------------- | ------------------- |
| liangzi | 162147                | 1280 × 720        | 5.9 秒              |
| baofeng | 165389                | 1920 × 1080       | 69.2 秒（刷新续播） |
| ruyi    | 88480                 | 1920 × 1080       | 48.2 秒             |
| maotai  | 154060                | 1080 × 1920       | 94.6 秒             |
| jisu    | 364                   | 1920 × 1080       | 29.1 秒             |
| douban  | 153609                | 1920 × 1080       | 63.3 秒             |
| modu    | 49919                 | 1920 × 800        | 61.8 秒             |

所有解码样本均读取到 video.readyState=4、非零 videoWidth／videoHeight 和递增播放时间。魔都 HTTP 清单抽样使用影片 37，浏览器解码另选影片 49919；其他源 HTTP 与解码使用相同影片。该检查只证明当时抽样可用，不代表所有旧影片均可用。

本机另一个项目同时监听 5173 的 IPv4 地址，Web Vite 使用 IPv6 localhost；刷新时出现过串到其他项目的情况。后半轮改用 http://localhost:8787 验证 API 同域静态产物，页面和播放均正常。常规开发仍分别使用 dev:api 与 dev:web；端口被占用时需换空闲端口并同步本地允许来源。

### 未完成的运行覆盖

- 当前浏览器工具只连接 Edge，未实测独立 Chrome。全屏自动化点击被浏览器拒绝，已验证失败提示；画中画按钮已操作，但未确认独立画中画窗口，因此两项成功路径需人工确认。
- 存储拒绝访问与损坏设置由单元测试覆盖；未在真实浏览器中耗尽 IndexedDB 配额、强制禁止 IndexedDB 或终止进程。IndexedDB 异常路径已静态审查，失败会提示并继续使用内存历史。
- 未执行生产 HTTPS 域名、真实 Cookie 部署、远程 D1、安卓设备或云端历史同步验证。Worker 的生产域名／数据库 ID 仍为占位配置。

本轮自审结论：实现和本地工程检查通过，浏览器验收为部分验证；剩余覆盖限制如上，没有已知未修复的范围内 Critical／High 问题。
