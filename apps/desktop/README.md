# ym-video 桌面端

Windows 视频聚合播放器，支持多播放源、搜索、在线播放、续播和本地观看历史。

## 技术栈

Electron 38、Vue 3、TypeScript、Vite、Vue Router、Pinia、Element Plus、Tailwind CSS 3、hls.js、better-sqlite3。

## 安装与启动

从 [GitHub Releases](https://github.com/2514765066/ym-video/releases) 或 [Gitee Releases](https://gitee.com/yxingyus/ym-video/releases) 下载 Windows 安装包，安装后即可使用。

从源码启动时，需要 Node.js 22.21.1、pnpm 11.20.0，在仓库根目录运行：

```sh
pnpm install --frozen-lockfile
pnpm setup:desktop
pnpm dev:desktop
```

`setup:desktop` 用于准备 Electron 的 SQLite 原生模块，首次运行或更换 Electron 版本后执行。没有适用的预编译模块时，需要 Python 和 Visual Studio C++ Build Tools。

## 使用

选择播放源后，可按分类浏览或搜索影片，打开影片选择集数播放。观看历史保存在本机，可从历史记录继续播放；设置中可管理播放源和外观偏好。

## 打包

在仓库根目录运行：

| 命令                 | 用途                                             |
| -------------------- | ------------------------------------------------ |
| `pnpm build:desktop` | 编译应用，产物位于 `apps/desktop/out/`           |
| `pnpm build:win`     | 生成 Windows 安装包，输出到 `apps/desktop/dist/` |
| `pnpm build:unpack`  | 生成未打包的应用目录                             |

项目介绍和使用声明见[根 README](../../README.md)。
