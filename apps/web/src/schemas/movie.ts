import { z } from 'zod';

// 上游缺省文字字段统一为空字符串。
const textSchema = z.string().catch('');

// 影片仅在采集站响应入口校验，地址按上游原值保留。
export const movieSchema = z.object({
  vod_id: z.union([z.string(), z.number()]).transform(String),
  vod_name: textSchema,
  vod_pic: textSchema,
  vod_year: textSchema,
  vod_area: textSchema,
  vod_lang: textSchema,
  type_name: textSchema,
  vod_remarks: textSchema,
  vod_play_url: textSchema,
});

// 列表结构与分页数量在响应入口处理。
export const movieListSchema = z.object({
  list: z.array(z.unknown()),
  pagecount: z.coerce.number().finite().nonnegative().catch(0),
});
