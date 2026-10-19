import { onScopeDispose, ref, watch, type WatchSource } from 'vue';
import type { Movie, Source } from '@/types';
import { getMovies } from '@/services/api';

// 首页、分类与搜索共用分页和请求取消行为。
export const useCatalogue = (
  input: WatchSource<{ source?: Source; category?: string; keyword?: string }>,
) => {
  // 当前查询已加载的影片列表。
  const movies = ref<Movie[]>([]);

  // 首次加载或刷新时的请求状态。
  const loading = ref(false);

  // 当前操作失败时的提示。
  const error = ref('');

  // 已经成功加载的页码。
  const page = ref(0);

  // 可用数据的总页数。
  const pageCount = ref(0);

  // 当前操作对应的数据快照。
  let current: {
    source?: Source;
    category?: string;
    keyword?: string;
  } = {};

  // 用于取消已失效请求。
  let controller: AbortController | undefined;

  // 成功后才推进页码，失败后重试同一页。
  const load = async (reset = false) => {
    if (!current.source) {
      controller?.abort();
      movies.value = [];
      page.value = 0;
      pageCount.value = 0;
      loading.value = false;
      error.value = '';
      return;
    }
    if (!reset && loading.value) {
      return;
    }
    if (!reset && page.value >= pageCount.value) {
      return;
    }
    controller?.abort();
    controller = new AbortController();

    // 捕获本次请求的取消信号。
    const signal = controller.signal;

    // 成功后才提交的目标页码。
    const targetPage = reset ? 1 : page.value + 1;

    // 本次请求使用的查询条件。
    const query = { ...current, source: current.source };
    if (reset) {
      movies.value = [];
      page.value = 0;
      pageCount.value = 0;
    }
    loading.value = true;
    error.value = '';
    try {
      // 本次异步操作返回结果。
      const result = await getMovies(
        query.source,
        { t: query.category, wd: query.keyword, pg: targetPage },
        signal,
      );
      if (signal.aborted) {
        return;
      }
      // 追加分页前已展示的影片。
      const existing = reset ? [] : movies.value;
      movies.value = [
        ...new Map(
          [...existing, ...result.movies].map((movie) => [movie.id, movie]),
        ).values(),
      ];
      page.value = targetPage;
      pageCount.value = result.pageCount;
    } catch (cause) {
      if (!signal.aborted) {
        error.value =
          cause instanceof Error ? cause.message : '加载失败，请重试';
      }
    } finally {
      if (!signal.aborted) {
        loading.value = false;
      }
    }
  };

  // 查询条件变化时旧页数据立即失效。
  watch(
    input,
    (value) => {
      current = value;
      load(true);
    },
    { immediate: true },
  );
  onScopeDispose(() => controller?.abort());
  return { movies, loading, error, page, pageCount, load };
};
