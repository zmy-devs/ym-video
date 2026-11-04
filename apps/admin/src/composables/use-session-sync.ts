import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authClient } from '@/services/auth';

// 会话身份变化时让当前管理页面重新检查权限。
export const useSessionSync = () => {
  // 当前账号来自 Better Auth 的响应式会话。
  const session = authClient.useSession();

  // 保留当前地址及完整查询条件。
  const route = useRoute();

  const router = useRouter();

  watch(
    () => {
      // 网络刷新失败时保留当前已确认的身份。
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
      if (user === undefined || !route.matched.length) {
        return;
      }

      if (user?.id === previous?.id && user?.role === previous?.role) {
        return;
      }

      await router.replace({ path: route.fullPath, force: true });
    },
  );
};
