# ym-video Android 壳

Android Tauri 工程只维护原生窗口、Android 权限、移动设备插件和 APK 构建脚本。页面与业务逻辑统一来自 `apps/web`。

## 开发

```sh
pnpm dev:api
pnpm dev:android
pnpm --filter @ym-video/mobile test:update
```

Android 开发模式加载 `apps/web` 的 `mobile` Vite 构建模式，并通过共享 `packages/native-core` 处理账号请求、历史同步和资源请求。

调试版名称为 `Ym Video Dev`，包名为 `com.zhangmingyang.ymvideo.dev`；正式版名称为 `Ym Video`，包名为 `com.zhangmingyang.ymvideo`。两者可同时安装在真机上，本地设置、登录状态和缓存各自独立。调试版包名后缀由 `bundle.android.debugApplicationIdSuffix` 配置，应用名称使用 Android `debug` 资源覆盖。

播放器通过 `.cargo/config.toml` 的 Wry Android 类扩展，对所有 HTTPS 片源的过期证书按会话放行；域名不匹配、不受信任等其他证书错误继续拦截。原生证书规则修改后需要重新构建和安装 APK。

播放器支持 HTTP 与 HTTPS 片源，调试版和正式版均允许 HTTP 明文流量。

先启动模拟器或连接设备。`pnpm dev:android` 会通过 ADB 将设备的 `3002`、`8788` 端口转发到本机，原生账号请求访问 `http://127.0.0.1:8788`。浏览器开发页的 `/api` 请求由 Vite 转发到同一个本地服务，资源接口由 Vite 在本机转发。

真机调试期间保持 `pnpm dev:api`、`pnpm dev:android` 两个进程运行，并保持 USB 调试连接。

## 构建

应用版本读取根 `package.json` 的 `version` 字段，与 Windows 共用。Tauri 自动从产品版本生成 Android `versionCode`；APK 文件名与更新清单也使用同一版本。

```sh
pnpm build:android
pnpm release:android
```

构建 ARM64 APK 前，在根 `.env` 配置 Android 签名密钥。移动端原生能力由 `packages/mobile-controls` 提供，包括状态栏图标样式、亮度、横屏、沉浸模式和保持屏幕常亮。

## 应用内更新

设置页共用检查更新、自动检查、下载进度和版本说明。APK 使用官方 `tauri-plugin-upload` 下载到应用缓存，用户点击“安装更新”后，由 `tauri-plugin-android-installer` 申请安装未知应用权限并打开系统安装器。返回应用后可以再次安装已下载的 APK。

`pnpm build:android` 生成 APK 和根 `dist/android.json`。`pnpm release:android` 上传版本 APK 后，将清单发布到 Gitee 的 `latest-android` 标签，客户端固定读取 `https://gitee.com/zmy-devs/ym-video/releases/download/latest-android/android.json`。Windows 使用独立的 `latest` 标签。

清单包含 `version`、`notes` 和 `url`，其中 `url` 为当前版本的 Gitee ARM64 APK 直链。应用升级必须保持包名、签名证书一致，并递增版本号与 Android `versionCode`。系统安装界面需要用户确认；插件只报告安装器是否打开，应用重启后读取实际安装版本。

## 本机覆盖升级验证

先停止 `pnpm dev:android`，连接一台 USB 调试设备，启动本地 API 后运行：

```sh
pnpm dev:api
pnpm test:update:android:local
```

命令生成两个包名为 `com.zhangmingyang.ymvideo.dev`、使用同一调试签名的 APK：基础包沿用手机当前调试版版本，首次安装使用工作区版本，更新包递增一个修订号。基础包安装到手机后，进入 `Ym Video Dev` 的设置点击“检查更新”，APK 将通过 USB 从电脑下载，再由系统安装器完成覆盖升级。重新打开后核对版本号、本地设置和登录状态。

本机服务只监听 `127.0.0.1:18789`，APK 保存在 `apps/mobile/build/local-update`。测试期间保持命令运行，结束时按 Ctrl+C。调试构建通过 `YM_VIDEO_ANDROID_LOCAL_UPDATE=1` 使用本机清单；正式构建使用 Gitee 更新入口。
