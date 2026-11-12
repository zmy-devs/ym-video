import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Category, CustomSource, Source } from '@/types';
import { getCategories, getSources } from '@/services/catalog-client';
import { StorageSerializers, useStorage } from '@vueuse/core';
import { customSourcesSchema } from '@/schemas/source';
import { useRequest } from '@/composables/use-request';
import { retryRequest } from '@ym-video/account/request-retry';
import { errorToast, storageError } from '@ym-video/ui/lib/toast';

// 统一管理平台源、本机自定义源与当前分类。
export const useLibraryStore = defineStore('library', () => {
  // 当前选择与资源加载状态。
  const selected = useStorage<string>('ym-video:source', 'baofeng', undefined, {
    listenToStorageChanges: false,
    serializer: StorageSerializers.object,
    onError: () => storageError('本地设置'),
  });

  // 自定义源在存储边界校验一次，界面和请求层使用已确认的数据。
  const customSources = useStorage<CustomSource[]>(
    'ym-video:custom-sources',
    [],
    undefined,
    {
      listenToStorageChanges: false,
      onError: () => storageError('本地设置'),
      serializer: {
        read: (raw) => {
          const value: unknown = JSON.parse(raw);
          return customSourcesSchema.safeParse(value).data ?? [];
        },
        write: JSON.stringify,
      },
    },
  );

  // 当前窗口使用自己的播放源快照，VueUse 负责保存本机偏好。
  const platformSources = ref<Source[]>([]);
  const sources = computed(() => [
    ...platformSources.value,
    ...customSources.value,
  ]);

  // 当前资源源提供的分类。
  const categories = ref<Category[]>([]);

  // 当前操作失败时的提示。
  const error = ref('');

  // 分类请求失败时的提示。
  const categoryError = ref('');

  // 首次加载或刷新时的请求状态。
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle');

  // 分类正在加载的状态。
  const categoryStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle');

  // 当前选择对应的播放源及其请求方式。
  const source = computed(() =>
    sources.value.find((item) => item.id === selected.value),
  );

  // 用于侧边栏展示的顶层分类。
  const parents = computed(() =>
    categories.value.filter((item) => item.parentId === 0),
  );

  // 分类请求替换时统一取消旧任务与重试等待。
  const { execute: loadCategories, cancel: cancelCategories } = useRequest(
    async (signal) => {
      categories.value = [];
      categoryError.value = '';
      if (!source.value) {
        categoryStatus.value = 'idle';
        return;
      }
      categoryStatus.value = 'loading';

      // 重试期间固定当前源，切源后旧任务不能继续请求新接口。
      const currentSource = source.value;

      try {
        // 本次异步操作返回结果。
        const result = await retryRequest(
          () => getCategories(currentSource, signal),
          signal,
        );
        if (!signal.aborted) {
          categories.value = result;
          categoryStatus.value = 'ready';
        }
      } catch (cause) {
        if (!signal.aborted) {
          categoryStatus.value = 'error';
          categoryError.value =
            cause instanceof Error ? cause.message : '分类加载失败';
          errorToast('分类加载失败，请刷新后重试', {
            id: 'category-load-error',
          });
        }
      }
    },
  );

  // 无效的旧设置回退到暴风源或首个可用源。
  const init = async () => {
    if (status.value === 'loading') {
      return;
    }
    status.value = 'loading';
    error.value = '';
    try {
      platformSources.value = await getSources();
      if (!sources.value.length) {
        throw new Error('暂无可用资源源，请稍后重试');
      }
      if (!sources.value.some((item) => item.id === selected.value)) {
        selected.value =
          sources.value.find((item) => item.id === 'baofeng')?.id ??
          sources.value[0].id;
      }
      await loadCategories();
      status.value = 'ready';
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '资源源加载失败';
      status.value = 'error';
    }
  };

  // 资源源切换只接受当前可用列表中的 ID。
  const select = async (id: string) => {
    if (
      selected.value === id ||
      !sources.value.some((item) => item.id === id)
    ) {
      return;
    }
    selected.value = id;
    error.value = '';
    status.value = 'ready';

    await loadCategories();
  };

  // 新增与编辑共用验证，失败或取消时保留原记录。
  const saveSource = async (
    name: string,
    url: string,
    signal: AbortSignal,
    id?: string,
  ) => {
    if (id && !customSources.value.some((item) => item.id === id)) {
      throw new Error('该播放源已不存在');
    }

    // 自定义源使用独立命名空间，历史记录也能稳定定位对应接口。
    const source: CustomSource = {
      id: id ?? `custom:${crypto.randomUUID()}`,
      name,
      url,
    };

    // 保存当前源时直接采用已验证分类，中止旧接口的分类请求。
    const verifiedCategories = await getCategories(source, signal);

    signal.throwIfAborted();

    if (id && !customSources.value.some((item) => item.id === id)) {
      throw new Error('该播放源已不存在');
    }

    if (
      customSources.value.some((item) => item.id !== id && item.url === url)
    ) {
      throw new Error('该接口地址已添加');
    }

    if (id) {
      customSources.value = customSources.value.map((item) =>
        item.id === id ? source : item,
      );
    } else {
      customSources.value = [...customSources.value, source];
    }

    if (!sources.value.some((item) => item.id === selected.value)) {
      selected.value = source.id;
    }

    if (selected.value === source.id) {
      cancelCategories();
      categories.value = verifiedCategories;
      categoryStatus.value = 'ready';
      categoryError.value = '';
      error.value = '';
      status.value = 'ready';
    }
  };

  // 新源使用独立 ID，编辑沿用已有记录 ID。
  const addSource = (name: string, value: string, signal: AbortSignal) =>
    saveSource(name, value, signal);

  // 只允许修改本机自定义源，平台源不能通过编辑接口变更。
  const updateSource = (
    id: string,
    name: string,
    value: string,
    signal: AbortSignal,
  ) => saveSource(name, value, signal, id);

  // 批量删除本机源，当前源被删除时切回默认源并刷新一次分类。
  const removeSources = async (ids: string[]) => {
    if (ids.some((id) => !customSources.value.some((item) => item.id === id))) {
      throw new Error('该播放源已不存在');
    }

    customSources.value = customSources.value.filter(
      (item) => !ids.includes(item.id),
    );

    if (ids.includes(selected.value)) {
      selected.value =
        sources.value.find((item) => item.id === 'baofeng')?.id ??
        sources.value[0]?.id ??
        '';

      await loadCategories();
    }

    error.value = sources.value.length ? '' : '暂无可用播放源，请添加播放源';
    status.value = sources.value.length ? 'ready' : 'error';
  };

  return {
    selected,
    sources,
    platformSources,
    customSources,
    categories,
    parents,
    source,
    error,
    categoryError,
    status,
    categoryStatus,
    init,
    select,
    loadCategories,
    addSource,
    updateSource,
    removeSources,
  };
});
