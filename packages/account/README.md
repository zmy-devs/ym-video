# @ym-video/account

Web 与 Admin 共用的账号业务，提供 Better Auth 客户端工厂、登录页、账号菜单、账号设置和 Zod 字段校验。

## 使用

通过 `workspace:*` 声明依赖，组件显式接收所属应用创建的认证客户端。

```ts
import { createAccountClient } from '@ym-video/account/client';
import AccountLogin from '@ym-video/account/login.vue';
import AccountSettings from '@ym-video/account/settings.vue';
import { accountSchema } from '@ym-video/account/schema';
```

登录页通过 `client`、`role`、`homeRoute` 和 `icon` 接收所属应用的认证客户端、目标角色、默认路由和品牌图标。应用可使用 `footer` 插槽保留各自的注册或返回链接。

在应用样式中导入账号组件的 Tailwind 扫描声明。

```css
@import '@ym-video/account/styles.css';
```

浏览器应用提供浏览器 fetch，桌面 Web 提供自身的原生请求适配器。账号列表和邀请管理归 Admin 应用维护。
