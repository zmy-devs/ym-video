import { parseMovie } from '../utils/movie.ts';
import type { Category, Movie, Source } from '../types/index.ts';
import { categoriesSchema } from '../schemas/source.ts';
import { movieListSchema } from '../schemas/movie.ts';
import { builtInSources } from '../constants/sources.ts';

import { requestResource } from './resource-client.ts';

// 目录请求统一处理影片解析、分类和分页。
export const getSources = async (): Promise<Source[]> => {
  return builtInSources.map(({ id, name, url }) => ({ id, name, url }));
};

export const getMovies = async (
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
  const result = movieListSchema.safeParse(body);

  if (!result.success) {
    throw new Error('影片列表格式错误，请切换资源源');
  }

  const movies = result.data.list.flatMap((item) => {
    const movie = parseMovie(item, source.id);
    return movie ? [movie] : [];
  });
  return {
    movies,
    pageCount: result.data.pagecount,
  };
};

export const getCategories = async (
  source: Source,
  signal?: AbortSignal,
): Promise<Category[]> => {
  const body = await requestResource(
    source,
    new URLSearchParams({ ac: 'list' }),
    signal,
  );
  const result = categoriesSchema.safeParse(body);

  if (!result.success) {
    throw new Error('分类数据格式错误，请检查接口地址');
  }

  return result.data;
};
