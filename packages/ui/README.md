# @ym-video/ui

Web 与 Admin 共用的 Vue 3 组件和主题，使用 shadcn-vue、Reka UI 与 Tailwind CSS 4。

## 使用

通过 `workspace:*` 声明依赖，并在应用样式中导入共享主题。

```css
@import '@ym-video/ui/styles.css';
```

```ts
import { Button } from '@ym-video/ui/components/button';
import Dialog from '@ym-video/ui/common/dialog.vue';
```

`components/` 维护 shadcn 基础组件，`common/` 维护通用二次封装。账号表单和应用业务由对应业务包及应用维护。

共享样式通过 `@source` 扫描本包源码。应用通过 Vite 编译源码，使用 `pnpm --filter @ym-video/ui run typecheck` 检查类型。
