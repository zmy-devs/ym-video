## 📺 ym-video

此目录为 monorepo 中保留的 Electron 桌面端（`@ym-video/desktop`），迁移到 Vue Web 前继续作为现有实现与回归基准。

请在仓库根目录安装依赖，使用 `pnpm dev:desktop`、`pnpm typecheck:desktop`、`pnpm build:desktop` 或 `pnpm build:win`。产物位于本目录的 `out/` 和 `dist/`；架构与后续安排见[根 README](../../README.md)和[架构文档](../../docs/architecture.md)。

首次运行桌面端前执行 `pnpm setup:desktop`，为当前 Electron 准备 SQLite 原生模块。该步骤从全仓安装中拆出，避免移动端开发依赖桌面编译工具；如果没有可用预编译包，需要 Python 和 Visual Studio C++ Build Tools。`build:desktop` 只编译代码，不等于已经验证原生模块能运行。

ym-video 是一款简洁、无广的视频聚合播放器应用
支持多种源接口、播放内核自由切换

## 📦 安装

从 Releases 页面下载最新的 ym-video 安装包即可

### 🟢 Android 安装包

- [GitHub 下载](https://github.com/2514765066/ym-video-app/releases)
- [Gitee 下载](https://gitee.com/yxingyus/ym-video-app/releases)

### 🟣 Windows 安装包

- [GitHub 下载](https://github.com/2514765066/ym-video/releases)
- [Gitee 下载](https://gitee.com/yxingyus/ym-video/releases)

## ⚠️ 免责声明

本软件仅供学习与技术交流使用，不得用于任何商业或非法用途。  
本项目 **不提供任何视频内容或接口资源**，所有数据均来自第三方来源。  
开发者对使用本软件所引发的任何后果、风险或法律责任不承担任何责任。  
请在遵守当地法律法规的前提下使用本软件。
