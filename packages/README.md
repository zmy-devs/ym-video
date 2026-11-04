# 共享包

各应用通过 workspace 依赖使用的共享模块。

| 包                  | 用途                                      | 使用方                  |
| ------------------- | ----------------------------------------- | ----------------------- |
| `@ym-video/ui`      | shadcn 基础组件、通用封装与主题           | Web、Admin              |
| `@ym-video/account` | 账号客户端、账号菜单、设置表单与 Zod 校验 | Web、Admin              |
| `@ym-video/catalog` | 影片模型、采集站数据转换与播放线路解析    | Web、移动端、history 包 |
| `@ym-video/history` | 影片与观看历史类型、数据校验、进度合并    | Web、API                |

## 使用

在仓库根目录运行 `pnpm install --frozen-lockfile` 后，应用通过 `@ym-video/*` 包导入，共享包直接导出源码，由使用方编译。UI 和账号组件的接入方式见各包 README。
