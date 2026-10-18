# PC Web

独立的 Vue 3、Vite、TypeScript、Vue Router、Pinia 应用，主题配色参考 ym-printer，支持跟随系统、浅色、深色与多种主题色，基础组件使用 shadcn-vue（Reka UI）与 Tailwind CSS 4。仅面向 PC 浏览器，推荐新版 Chrome 或 Edge。

## 本地开发

从仓库根目录安装依赖，按 [API 说明](../api/README.md) 配置 apps/api/.env 并迁移本地 D1，然后在两个终端分别运行：

```sh
pnpm dev:api
pnpm dev:web
```

访问 http://localhost:5173。Vite 将 /api 转发到 http://localhost:8787，Better Auth 使用同源 Cookie。pnpm preview:web 在 http://localhost:4173 预览已构建的 Web，并使用同一个 API 代理。根目录不再提供 pnpm dev；旧客户端使用 pnpm dev:desktop。

```sh
pnpm typecheck:web
pnpm build:web
pnpm test:web
```

## 功能与数据

- 首页、分类、观看历史；侧边栏顶部切换播放源，搜索打开 Command 弹窗，底部头像管理账号，右侧设置按钮通过二级菜单切换基础主题与主题色，并提供 Bug 反馈入口。侧边栏、输入、选择、弹窗、菜单、骨架屏、滚动、滑块和提示使用本地 shadcn-vue 组件。
- 邮箱注册、登录与退出；游客可以浏览和播放。账号令牌不写入 localStorage。
- 播放路由为 /player/:sourceId/:vodId，使用源 ID 与影片 ID 共同标识；刷新先恢复本地历史，无历史时请求影片详情。支持续播、选集、上一集／下一集、倍速、音量、全屏和浏览器允许时的画中画。
- 观看历史保存在 ym-video-web IndexedDB；播放源、搜索历史、音量和主题偏好使用带 ym-web: 前缀的 localStorage。登录不会上传、合并或绑定这些记录。清除浏览器数据会删除本地记录。
- 进度每 10 秒及暂停、切集、页面隐藏、离开播放器时保存；关闭标签页只作补充保存。强制终止浏览器仍可能丢失最后几秒。存储被禁用或空间不足时提示并保留本次页面中的内存数据。

快捷键：Ctrl/Cmd K 搜索；播放器空格播放／暂停，左右方向键跳转 5 秒，长按右键临时三倍速，上下方向键调整音量，F 切换全屏。输入与控件获得焦点时保留其键盘行为。

## 资源与托管

资源源来自 /api/v1/proxy/sources，默认暴风源，Web 不接受任意代理目标。资源 JSON 经 API 转发，媒体由客户端直连。清单加载器在保留实际响应 URL 的同时过滤原有 adjump 分片，正确解析相对、根路径、子清单和密钥地址；HTTP 媒体在 HTTPS 页面中会被拒绝。源可用性与跨域配置可能变化，失败可重试或切换源。

Web 不新增 Worker。apps/api/wrangler.jsonc 托管 ../web/dist，/api、/api/\* 优先执行 Worker，页面导航采用 SPA 回退。API 开发、构建和部署脚本先准备 Web 产物。生产环境将认证 URL 与允许来源配置为同一个真实 Web 域名；当前占位配置不能直接用于生产。

src/components/ui 来自官方 shadcn-vue new-york-v4 registry，保留本地源码；全屏播放器为 Select／Tooltip 增加 portal 容器支持。使用统一的 components.json 和 src/lib/utils.ts。不跨应用引用源码，不引入旧桌面 UI 库。
