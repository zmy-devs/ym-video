# Monorepo 迁移验证

验证日期：2026-10-17。范围为工作区、目录和必要配置迁移；业务代码、依赖清理和升级留到下一阶段。

## 已通过

| 检查                                       | 结果                                                                                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm -r list --depth -1`                  | 识别根工程及 `@ym-video/desktop`、`@ym-video/mobile`                                                                                           |
| `pnpm install --frozen-lockfile`           | 根安装成功；未更新锁定解析版本                                                                                                                 |
| `pnpm install --frozen-lockfile --offline` | 本地缓存齐全后，冻结锁离线安装成功                                                                                                             |
| `pnpm build:desktop`                       | 主进程与 Vue 类型检查、主进程／preload／renderer 构建均通过                                                                                    |
| Expo 配置解析                              | 显示名／slug 为 `ym-video`、scheme 为 `ymvideo`、安卓包名为 `com.zhangmingyang.ymvideo`                                                        |
| Metro 配置解析                             | 应用根目录正确指向 `apps/mobile`，NativeWind 生成声明正常                                                                                      |
| 安卓 JS 打包                               | 在 `apps/mobile` 设置 `CI=1`、`EXPO_OFFLINE=1` 后执行 `expo export --platform android --output-dir .expo/monorepo-export`；1830 个模块成功打包 |
| 源码完整性                                 | 桌面端 157 个、移动端 87 个源码／资源文件与迁移前哈希一致                                                                                      |
| 依赖保留                                   | 两端直接依赖范围、原锁的直接解析版本均保持一致；间接重复记录的合并规则见架构文档                                                               |
| 原仓库与用户配置                           | 原 `ym-video-app` 跟踪文件未改动；用户已有格式配置内容未改动；未引入嵌套 Git／锁文件／workspace                                                |
| 格式与路径                                 | 本次新增文档和完整修改的配置通过 Prettier；文档相对链接有效；`git diff --check` 无问题                                                         |

## 原代码可复现的类型问题

`pnpm typecheck:mobile` 未通过，共 4 处：

| 位置                                                                                   | 问题                                      |
| -------------------------------------------------------------------------------------- | ----------------------------------------- |
| [loading.tsx:26](../apps/mobile/src/components/loading.tsx#L26)                        | `ViewStyle` 不接受 `animationDuration`    |
| [loading.tsx:62](../apps/mobile/src/components/loading.tsx#L62)                        | 同上                                      |
| [useVisible.ts:16](../apps/mobile/src/hooks/useVisible.ts#L16)                         | 定时器返回值 `Timeout` 与 `number` 不兼容 |
| [useControlStore.ts:15](../apps/mobile/src/views/player/stores/useControlStore.ts#L15) | 同上                                      |

将原移动端仓库的源码和 tsconfig 复制到临时目录，使用相同安装依赖及 NativeWind 生成声明进行对照检查，复现了相同的 4 处错误；本次未改动这些文件。根 `pnpm typecheck`／`pnpm check` 会包含移动端检查，因此当前不能视为全仓类型检查通过。这些问题留到后续依赖整理和业务重构阶段处理。

## 环境限制与未执行项

- Electron 的 SQLite 原生准备未通过：本机缺少 Visual Studio C++ Build Tools，`electron-builder install-app-deps` 无法编译当前 `better-sqlite3`。原生准备已改为根 `pnpm setup:desktop`，不会再阻塞全仓依赖安装；运行旧桌面客户端前仍需完成这一步。
- 未执行桌面运行验证、Windows 安装包生成、安卓真机／模拟器运行或 APK 原生编译。Metro 导出成功只代表 JS／资源解析成功。
- 未执行 EAS 云构建、远程发布或部署；Web、Fastify API、登录和云端历史尚未实现，不在本轮验证范围。

本轮自审结果：结构与配置迁移检查通过；应用层整体为部分验证，保留上述已知类型问题与环境限制。
