# ym-video 桌面端

Windows 桌面壳加载部署后的 ym-video Web 应用。账号、播放、观看历史和资源请求沿用 Web 与 API 的现有服务。

## 技术栈

Electron 43、electron-vite 5、electron-builder 26、electron-updater 6、TypeScript。

## 安装与启动

从 [GitHub Releases](https://github.com/2514765066/ym-video/releases) 或 [Gitee Releases](https://gitee.com/yxingyus/ym-video/releases) 下载 Windows 安装包，安装后即可使用。

桌面端通过 `YM_VIDEO_WEB_URL` 指向已部署的 HTTPS 站点。开发时可将其指向本地 Web 服务；开发模式允许 `http://localhost:5173`。发布配置放在 `apps/desktop/.env`，可参考 `.env.example`。

从源码启动时，需要 Node.js 22.21.1、pnpm 11.20.0，在 `apps/desktop/.env` 配置站点地址后，在仓库根目录运行：

```sh
pnpm install --frozen-lockfile
pnpm dev:desktop
```

桌面端无法连接 Web 站点时会显示本地重试页。桌面端更新只覆盖 Electron 应用壳；Web 页面在站点部署后，重新打开或刷新桌面端即可加载新版本。旧版本留下的本地 SQLite 文件不会迁移或由新版本删除。

桌面端更新通过 GitHub Releases 检查；Gitee Releases 同步提供安装包下载。

## 打包

在仓库根目录运行：

| 命令                 | 用途                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| `pnpm build:desktop` | 编译应用，产物位于 `apps/desktop/out/`                                     |
| `pnpm build:win`     | 生成 Windows 安装包、`latest.yml` 和 blockmap，输出到 `apps/desktop/dist/` |
| `pnpm build:unpack`  | 生成未打包的应用目录                                                       |

发布时运行 `pnpm release:desktop`，需要在 `apps/desktop/.env` 配置 `GITEE_TOKEN` 和 `GH_TOKEN`；该命令会上传 Windows 安装包及 Electron 更新元数据。

项目介绍和使用声明见[根 README](../../README.md)。
