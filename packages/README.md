# 共享包

供各应用使用的 TypeScript 共享模块。

| 包                  | 用途                                   | 使用方   |
| ------------------- | -------------------------------------- | -------- |
| `@ym-video/history` | 影片与观看历史类型、数据校验、进度合并 | Web、API |

## 使用

在仓库根目录运行 `pnpm install --frozen-lockfile` 后，应用通过 `@ym-video/history` 导入。该包直接导出 TypeScript 源码，无需单独启动或构建。
