import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Category, Source } from '@/types';
import { getCategories, getSources } from '@/services/api';
import { readLocal, writeLocal } from '@/lib/storage';

// 共享资源源与分类，界面只消费服务端返回的源。
export const useLibraryStore = defineStore('library', () => {
  // 当前选择与资源加载状态。
  const selected = ref(
    readLocal(
      'source',
      'baofeng',
      (value): value is string => typeof value === 'string',
    ),
  );

  // 服务端允许访问的资源源。
  const sources = ref<Source[]>([]);

  // 当前资源源提供的分类。
  const categories = ref<Category[]>([]);

  // 当前操作失败时的提示。
  const error = ref('');

  // 分类请求失败时的提示。
  const categoryError = ref('');

  // 首次加载或刷新时的请求状态。
  const loading = ref(false);

  // 分类正在加载的状态。
  const categoryLoading = ref(false);

  // 当前选择对应的服务端资源源。
  const source = computed(() =>
    sources.value.find((item) => item.id === selected.value),
  );

  // 用于侧边栏展示的顶层分类。
  const parents = computed(() =>
    categories.value.filter((item) => item.parentId === 0),
  );

  // 用于取消已失效请求。
  let controller: AbortController | undefined;

  // 切源中止旧分类请求，旧结果不覆盖新源。
  const loadCategories = async () => {
    controller?.abort();
    controller = new AbortController();

    // 捕获本次请求的取消信号。
    const signal = controller.signal;
    categories.value = [];
    categoryError.value = '';
    categoryLoading.value = true;
    try {
      // 本次异步操作返回结果。
      const result = await getCategories(selected.value, signal);
      if (!signal.aborted) {
        categories.value = result;
      }
    } catch (cause) {
      if (!signal.aborted) {
        categoryError.value =
          cause instanceof Error ? cause.message : '分类加载失败';
      }
    } finally {
      if (!signal.aborted) {
        categoryLoading.value = false;
      }
    }
  };

  // 无效的旧设置回退到暴风源或首个可用源。
  const init = async () => {
    if (loading.value) {
      return;
    }
    loading.value = true;
    error.value = '';
    try {
      sources.value = await getSources();
      if (!sources.value.length) {
        throw new Error('暂无可用资源源，请稍后重试');
      }
      if (!sources.value.some((item) => item.id === selected.value)) {
        selected.value =
          sources.value.find((item) => item.id === 'baofeng')?.id ??
          sources.value[0].id;
      }
      await loadCategories();
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '资源源加载失败';
    } finally {
      loading.value = false;
    }
  };

  // 资源源切换只接受当前服务端列表中的 ID。
  const select = async (id: string) => {
    if (
      selected.value === id ||
      !sources.value.some((item) => item.id === id)
    ) {
      return;
    }
    selected.value = id;
    writeLocal('source', id);
    await loadCategories();
  };

  return {
    selected,
    sources,
    categories,
    parents,
    source,
    error,
    categoryError,
    loading,
    categoryLoading,
    init,
    select,
    loadCategories,
  };
});
