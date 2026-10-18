import { expo } from '@better-auth/expo';

// 运行时和认证表生成器共用，新增认证插件时同步生成 schema 和迁移。
export const authOptions = {
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  plugins: [expo()],
};
