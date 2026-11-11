# @ym-video/account

各应用共用的账号业务，提供 Better Auth 客户端工厂、账号路由、请求重试和 Zod 字段校验。账号界面组件统一由 `@ym-video/ui` 提供。

## 使用

通过 `workspace:*` 声明依赖，组件显式接收所属应用创建的认证客户端。

```ts
import { createAccountClient } from '@ym-video/account/client';
import { accountSchema } from '@ym-video/account/schema';
```

统一客户端的账号请求由 Tauri 原生网络核心适配，Admin 维护账号列表和一次性邀请码。注册页面提交邀请码后创建普通用户账号。
