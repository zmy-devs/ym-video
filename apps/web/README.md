# Web 应用（待迁移）

目标技术栈为 Vue 3、Vite、TypeScript、Vue Router 和 Pinia。

目标部署使用 Cloudflare Workers Static Assets，与 Fastify API 同域。登录使用 Better Auth Vue 客户端及会话 Cookie，云端账号与历史保存于 D1；Web 只调用 API，不直接访问数据库。具体方案见 [API 建设文档](../api/README.md)，目前均尚未实现。

本轮仅建立 monorepo。现有 Vue 页面和 hls.js 播放器仍位于 `../desktop/src/renderer/`，尚未迁移到这里，因此本目录没有 `package.json`，也没有可运行的 Web 应用。

下一阶段从桌面端迁入页面与播放器，将 Electron IPC 请求改为调用 Fastify API，将窗口切换改为页面路由，并将本地 SQLite 适配为浏览器存储。迁移时再处理依赖清理、升级和业务重构。

Web 专属组件、浏览器存储和播放器留在本应用；可跨端复用的接口契约和纯业务逻辑按实际需求提取到根目录 `packages/`。
