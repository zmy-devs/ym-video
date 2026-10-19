# ym-video Web

面向 PC 浏览器的视频聚合播放器，支持浏览、搜索、多播放源、在线播放、续播与跨设备观看历史。推荐使用新版 Chrome 或 Edge。

## 技术栈

Vue 3、TypeScript、Vite、Vue Router、Pinia、shadcn-vue（Reka UI）、Tailwind CSS 4、hls.js。

## 启动

在仓库根目录安装依赖，并按 [API 说明](../api/README.md) 配置本地环境、应用数据库迁移。

在两个终端分别运行：

```sh
pnpm dev:api
```

```sh
pnpm dev:web
```

访问 <http://localhost:5173>。Web 的 `/api` 请求会转发到 <http://localhost:8787>。

默认端口被占用时可运行 `pnpm dev:web --port 3000`。使用其他端口时，需要在 `apps/api/wrangler.jsonc` 的 `WEB_ORIGINS` 中添加对应来源。

## 使用

- 使用邮箱和密码登录；新用户通过管理员提供的邀请链接注册。管理员登录后进入账号后台，可创建、停用、删除账号及生成邀请。
- 在概览或分类页浏览影片，通过搜索查找内容；侧栏底部的播放源菜单可切换或添加播放源。
- 播放器支持选集、续播、上一集／下一集、倍速、音量、全屏和画中画。头像菜单中的设置可修改外观、用户名和密码。

观看历史按账号同步，离线操作会在联网后补传。自定义播放源、搜索记录、音量和主题仅保存在当前浏览器；清除浏览器数据会删除这些偏好及尚未上传的历史，已同步历史可重新读取。

自定义源需允许浏览器跨域访问；通过 HTTPS 访问 Web 时，源接口和媒体地址也应使用 HTTPS。

## 快捷键

| 快捷键       | 操作            |
| ------------ | --------------- |
| Ctrl/Cmd + K | 打开搜索        |
| Ctrl/Cmd + B | 展开／收起侧栏  |
| 空格         | 播放／暂停      |
| 左右方向键   | 后退／前进 5 秒 |
| 长按右方向键 | 临时三倍速      |
| 上下方向键   | 调整音量        |
| F            | 切换全屏        |

## 构建与预览

```sh
pnpm build:web
pnpm preview:web
```

产物位于 `apps/web/dist/`，预览地址为 <http://localhost:4173>，预览时仍需启动 API。生产环境由 API Worker 同时提供网页和接口，部署方法见 [API 说明](../api/README.md)。
