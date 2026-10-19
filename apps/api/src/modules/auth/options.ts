import { expo } from '@better-auth/expo';
import { admin, username } from 'better-auth/plugins';
import type { BetterAuthOptions } from 'better-auth';
import { isValidUsername } from './username';

// 运行时和认证表生成器共用，新增认证插件时同步生成 schema 和迁移。
export const authOptions = {
  // 保留用户名管理能力，关闭用户名登录入口。
  disabledPaths: ['/sign-in/username'],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 6,
    maxPasswordLength: 128,
  },
  plugins: [
    expo(),
    username({ displayUsername: false, usernameValidator: isValidUsername }),
    admin({
      defaultRole: 'user',
      adminRoles: ['admin'],
      bannedUserMessage: '账号已停用，请联系管理员',
    }),
  ],
} satisfies BetterAuthOptions;
