# ym-video Windows 桌面端

Windows x64 客户端，使用 Tauri 2、Rust 和 WebView2，加载与 Android 共用的 Vue 客户端页面。Android 客户端见[移动端说明](../mobile/README.md)。

## 环境与开发

需要根 package.json 指定的 Node.js 和 pnpm，以及 Rust stable（MSVC 工具链、rustfmt、Clippy）、Visual Studio C++ 构建工具和 WebView2 Runtime。Rust 支持使用 CARGO_HOME 与 RUSTUP_HOME 指定安装和缓存目录。

在仓库根目录安装依赖并启动本地 API，然后运行桌面开发服务，Tauri 会同时启动 `apps/web` 的 desktop 模式。

```sh
pnpm install --frozen-lockfile
pnpm dev:api
pnpm dev:desktop
```

应用使用 40px 自制标题栏与窗口控件，支持窗口拖动、双击最大化、主题同步和视频全屏。再次启动会唤起已有窗口。

开发运行与安装版均可使用 `Ctrl+Shift+I` 打开 WebView2 开发者工具，检查页面元素、控制台和网络请求。

生产页面从安装包加载，账号与历史 API 连接 https://ym-video.zhangmingyang.dpdns.org。账号 Cookie 由共享 Rust 核心管理，并使用 Windows DPAPI 加密保存在应用数据目录。资源源请求由独立 HTTP 客户端处理。

Windows 播放器对所有 HTTPS 片源的证书过期错误按会话放行，其他证书错误沿用 WebView2 校验。

## 检查与构建

所有命令在仓库根目录执行。桌面构建、测试和发布脚本使用 TypeScript，通过 tsx 运行，并纳入类型检查。

Windows 回归测试使用 `cargo install tauri-driver --locked` 安装驱动，将匹配 WebView2 版本的 `msedgedriver.exe` 放入 `CARGO_HOME/bin`，并准备 FFmpeg。测试使用本地 5180 和 8788 端口。

| 命令                                          | 用途                                             |
| --------------------------------------------- | ------------------------------------------------ |
| `pnpm typecheck:desktop`                      | TypeScript 与 Rust 类型检查                      |
| `pnpm test:desktop`                           | Rust 测试、浏览器回归与 Windows WebDriver 验证   |
| `pnpm --filter @ym-video/desktop test:update` | Windows 更新设置、任务与原生签名回归测试         |
| `pnpm build:desktop`                          | 构建内置 Web 页面和 Windows 可执行文件           |
| `pnpm build:win`                              | 构建 NSIS 安装包及更新签名，汇总到桌面 dist 目录 |
| `pnpm start`                                  | 运行已构建的 release 可执行文件                  |

NSIS 安装程序会在需要时安装 WebView2 Runtime。`build:win` 生成 `ym-video-<version>-windows-x64.exe`、对应 `.sig` 和 `latest.json`。

## 应用更新

在设置的“更新”中手动检查新版本，或开启“自动更新”，启动时每天检查一次。发现新版本后自动下载安装包，下载完成后点击“安装并重启”。更新任务在关闭设置后继续运行；下载或签名校验失败可以重新检查，安装失败可以直接重试安装。

客户端使用 Tauri 官方 updater，优先读取 Gitee 的 `latest/latest.json`，同时配置 GitHub 更新入口。每个站点的清单指向该站点的版本安装包；下载与安装均由插件校验签名。

## 签名与发布

首次构建安装包时自动在用户目录 `.tauri/ym-video.key` 生成更新签名密钥，公钥保存在 Tauri 配置中。请备份私钥，后续版本使用同一密钥。

将 `.env.development.example` 复制为同目录 `.env.development`，填写发布令牌。可通过 `TAURI_SIGNING_PRIVATE_KEY` 指定私钥文件，通过 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 提供密码。构建脚本把本地配置传入 Tauri 子进程。

```sh
pnpm build:win
pnpm release:desktop
```

发布目标为 [GitHub Releases](https://github.com/zmy-devs/ym-video/releases) 和 [Gitee Releases](https://gitee.com/zmy-devs/ym-video/releases)。Windows 发布完整版本的安装包与签名后更新清单。

项目介绍和使用声明见[根 README](../../README.md)。
