# 共享包

| 包                             | 用途                                               | 使用方            |
| ------------------------------ | -------------------------------------------------- | ----------------- |
| `@ym-video/ui`                 | 基础组件、通用封装、主题和账号界面                 | 统一客户端、Admin |
| `@ym-video/account`            | Better Auth 客户端、重试、字段校验和邀请码注册契约 | 统一客户端、Admin |
| `@ym-video/history`            | 影片与历史数据契约、边界校验和进度合并             | 统一客户端、API   |
| `ym-video-native-core`         | Tauri 网络请求、Cookie 会话和平台安全存储          | Desktop、Android  |
| `tauri-plugin-mobile-controls` | Android 亮度、方向、沉浸和常亮控制                 | Android           |

统一客户端由 `apps/web` 维护，两个 Tauri 壳分别加载 desktop 和 mobile 构建模式。

目录解析、内置播放源、播放器、影片卡片、问候、本机历史队列和历史请求位于 `apps/web/src`。
