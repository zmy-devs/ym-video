import { parseMovie } from '../lib/movie.ts';
import type { Category, Movie, Source } from '../types.ts';
import { parseCategories } from '../lib/source.ts';
import { builtInSources } from '../lib/built-in-sources.ts';

type CatalogClientOptions = {
  requestResource: (
    source: Source,
    query: URLSearchParams,
    signal?: AbortSignal,
  ) => Promise<unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown) => (typeof value === 'string' ? value : '');

// 目录请求统一处理影片解析、分类和分页。
export const createCatalogClient = ({
  requestResource,
}: CatalogClientOptions) => ({
  getSources: async (): Promise<Source[]> => {
    return builtInSources.map(({ id, name, url }) => ({ id, name, url }));
  },

  getMovies: async (
    source: Source,
    query: Record<string, string | number | undefined> = {},
    signal?: AbortSignal,
  ): Promise<{ movies: Movie[]; pageCount: number }> => {
    const params = new URLSearchParams({ ac: 'detail' });
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    });

    const body = await requestResource(source, params, signal);
    if (!isRecord(body) || !Array.isArray(body.list)) {
      throw new Error('影片列表格式错误，请切换资源源');
    }

    const movies = body.list.flatMap((item: unknown) => {
      const movie = parseMovie(item, source.id);
      return movie ? [movie] : [];
    });
    const pageCount = Number(body.pagecount);

    return {
      movies,
      pageCount: Number.isFinite(pageCount) ? Math.max(0, pageCount) : 0,
    };
  },

  getCategories: async (
    source: Source,
    signal?: AbortSignal,
  ): Promise<Category[]> => {
    const body = await requestResource(
      source,
      new URLSearchParams({ ac: 'list' }),
      signal,
    );
    return parseCategories(body);
  },

  text,
});
