# ym-video 安卓端

基于 Expo 和 React Native 的安卓视频聚合播放器，支持播放源切换、搜索、原生视频播放、续播和本地观看历史。

## 技术栈

Expo SDK 54、React 19、React Native 0.81、TypeScript、Expo Router、NativeWind、Valtio、react-native-video、expo-sqlite、MMKV。

## 安装与启动

从 [GitHub Releases](https://github.com/2514765066/ym-video-app/releases) 或 [Gitee Releases](https://gitee.com/yxingyus/ym-video-app/releases) 下载 APK，安装后即可使用。

从源码运行需要 Node.js 22.21.1、pnpm 11.20.0、Android SDK、JDK，以及安卓设备或模拟器。在仓库根目录执行：

```sh
pnpm install --frozen-lockfile
pnpm dev:mobile
```

该命令会生成原生工程并构建、运行安卓应用。已有原生工程时，可通过 `pnpm android` 再次运行。

仅启动 Metro：

```sh
pnpm --filter @ym-video/mobile exec expo start
```

## 使用

选择播放源后，可按分类浏览或搜索影片，打开影片选择集数播放。观看历史和偏好保存在本机，可从历史记录继续播放。

## 云构建

需要 EAS CLI、Expo 账号，并通过环境变量 `EAS_PROJECTID_YMVIDEO` 提供项目 ID。在仓库根目录运行：

```sh
pnpm build:mobile
```

该命令使用 `production` 配置执行安卓云构建，完成后从 EAS 下载 APK。手动运行 EAS 命令时，进入 `apps/mobile` 目录。

项目介绍和使用声明见[根 README](../../README.md)。
