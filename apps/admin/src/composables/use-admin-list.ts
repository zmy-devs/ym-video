import { computed, onUnmounted, ref, shallowRef, watch } from 'vue';
import { watchDebounced } from '@vueuse/core';
import type { AdminPage } from '@/services/admin';

// 搜索、分页与取消过期请求由两个管理列表共用。
export const useAdminList = <T>(
  load: (
    page: number,
    search: string,
    signal: AbortSignal,
  ) => Promise<AdminPage<T>>,
) => {
  // 表格当前页和查询条件。
  const page = ref(1);
  const search = ref('');
  const keyword = ref('');
  const items = shallowRef<T[]>([]);
  const total = ref(0);
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const error = ref('');
  // 完成过有效查询后才展示空状态，避免首次加载闪烁。
  const loaded = ref(false);
  // 空结果同时适用于没有记录和搜索无匹配，操作区提供恢复入口。
  const empty = computed(
    () =>
      loaded.value &&
      status.value !== 'loading' &&
      !error.value &&
      !items.value.length,
  );
  let controller: AbortController | undefined;

  // 快速输入或翻页时取消旧请求，避免旧结果覆盖新列表。
  const refresh = async () => {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    status.value = 'loading';
    error.value = '';
    try {
      const result = await load(page.value, keyword.value, current.signal);
      if (current.signal.aborted) {
        return;
      }
      const lastPage = Math.max(1, Math.ceil(result.total / 20));
      if (page.value > lastPage) {
        page.value = lastPage;
        return;
      }
      items.value = result.items;
      total.value = result.total;
      loaded.value = true;
      status.value = 'ready';
    } catch (cause) {
      if (!current.signal.aborted) {
        status.value = 'error';
        error.value =
          cause instanceof Error ? cause.message : '加载失败，请重试';
      }
    }
  };

  watchDebounced(
    search,
    (value) => {
      keyword.value = value.trim();
      if (page.value !== 1) {
        page.value = 1;
        return;
      }
      return refresh();
    },
    { debounce: 300 },
  );
  watch(page, refresh, { immediate: true });
  onUnmounted(() => controller?.abort());
  return { page, search, items, total, status, loaded, error, empty, refresh };
};
