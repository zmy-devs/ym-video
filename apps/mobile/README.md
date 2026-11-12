# ym-video Android 壳

Android Tauri 工程只维护原生窗口、Android 权限、移动设备插件和 APK 发布脚本。页面与业务逻辑统一来自 `apps/web`。

## 开发

```sh
pnpm dev:api
pnpm dev:android
```

Android 开发模式加载 `apps/web` 的 `mobile` Vite 构建模式，并通过共享 `packages/native-core` 处理账号请求、历史同步和资源请求。

播放器通过 `.cargo/config.toml` 的 Wry Android 类扩展，对所有 HTTPS 片源的过期证书按会话放行；域名不匹配、不受信任等其他证书错误继续拦截。原生证书规则修改后需要重新构建和安装 APK。

先启动模拟器或连接设备。`pnpm dev:android` 会通过 ADB 将设备的 `3002`、`8788` 端口转发到本机，原生账号请求访问 `http://127.0.0.1:8788`。浏览器开发页的 `/api` 请求由 Vite 转发到同一个本地服务，资源接口由 Vite 在本机转发。

## 构建

```sh
pnpm build:android
pnpm release:android
```

构建 ARM64 APK 前，在 `apps/mobile/.env` 配置 Android 签名密钥。移动端原生能力由 `packages/mobile-controls` 提供，包括状态栏图标样式、亮度、横屏、沉浸模式和保持屏幕常亮。
