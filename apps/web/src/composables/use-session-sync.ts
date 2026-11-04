import { watchImmediate } from '@vueuse/core';
import { useRoute, useRouter } from 'vue-router';
import { authClient } from '@/services/auth';
import { useHistoryStore } from '@/stores/history-store';

// 会话身份变化时切换历史归属，并让当前页面重新检查权限。
export const useSessionSync = () => {
  // Better Auth 负责刷新会话与同步其他标签页的账号变化。
  const session = authClient.useSession();

  // 历史队列和页面缓存始终属于当前普通账号。
  const history = useHistoryStore();

  // 当前页面重新经过守卫，播放器切账号时返回概览。
  const route = useRoute();

  const router = useRouter();

  watchImmediate(
    () => {
      // 临时网络错误不作为退出登录或切换账号。
      const value = session.value;

      if (
        value.isPending ||
        (value.error && ![401, 403].includes(value.error.status))
      ) {
        return undefined;
      }

      return value.error ? null : (value.data?.user ?? null);
    },
    async (user, previous) => {
      if (user === undefined) {
        return;
      }

      // 管理员在独立应用中使用，不分配影视历史队列。
      const ownerId = user?.role === 'admin' ? null : (user?.id ?? null);

      const changed = history.ownerId !== ownerId;

      await history.setAccount(ownerId);

      if (history.ownerId !== ownerId || !route.matched.length) {
        return;
      }

      if (changed && route.name === 'player') {
        await router.replace({ name: 'overview' });

        return;
      }

      if (user?.id === previous?.id && user?.role === previous?.role) {
        return;
      }

      await router.replace({ path: route.fullPath, force: true });
    },
  );
};
