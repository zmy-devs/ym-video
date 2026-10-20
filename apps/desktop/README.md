# ym-video 桌面端

Windows 桌面端内置 ym-video Web 应用，页面与静态资源从安装包加载，断网也能打开界面。账号、观看历史同步和视频播放仍依赖网络。

## 技术栈

Electron 43、electron-vite 5、electron-builder 26、electron-updater 6、TypeScript。

## 安装与启动

从 [GitHub Releases](https://github.com/2514765066/ym-video/releases) 或 [Gitee Releases](https://gitee.com/yxingyus/ym-video/releases) 下载 Windows 安装包，安装后即可使用。

开发模式连接 `http://localhost:3000`。生产模式读取 `out/renderer/` 中的内置页面，同时沿用 `src/main/utils/web.ts` 中的 HTTPS 来源，登录 Cookie、本地偏好和观看历史继续使用原有存储；`/api` 请求连接线上服务。

从源码启动时，需要 Node.js 22.21.1、pnpm 11.20.0。先在其他终端启动 `pnpm dev:api`（Web 由 electron-vite 自动启动），再在仓库根目录运行：

```sh
pnpm install --frozen-lockfile
pnpm dev:desktop
```

桌面端页面随应用一起更新；修改 Web 页面后需要重新打包并发布桌面版本。接口不可用时，内置页面仍可显示连接状态和登录入口。旧版本留下的本地 SQLite 文件不会迁移或由新版本删除。

桌面端更新通过 GitHub Releases 检查；Gitee Releases 同步提供安装包下载。

## 打包

在仓库根目录运行：

| 命令                 | 用途                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| `pnpm build:desktop` | 编译桌面端并自动构建 Web，页面位于 `apps/desktop/out/renderer/`            |
| `pnpm build:win`     | 生成 Windows 安装包、`latest.yml` 和 blockmap，输出到 `apps/desktop/dist/` |
| `pnpm build:unpack`  | 生成未打包的应用目录                                                       |

发布前将 `apps/desktop/.env.development.example` 复制为同目录下的 `.env.development`，填写 `GITEE_TOKEN` 和 `GH_TOKEN`；该文件不会提交到 Git。运行 `pnpm release:desktop` 上传 Windows 安装包及 Electron 更新元数据。

项目介绍和使用声明见[根 README](../../README.md)。
