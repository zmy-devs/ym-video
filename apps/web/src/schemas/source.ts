import { z } from 'zod';

// 分类编号兼容采集站返回的整数和数字字符串。
const categoryIdSchema = z
  .union([z.number(), z.string().regex(/^\d+$/)])
  .transform(Number)
  .pipe(z.number().int().nonnegative());

// 分类入口统一验证字段、编号和父子关系。
export const categoriesSchema = z
  .object({
    class: z
      .array(
        z.object({
          type_id: categoryIdSchema.refine((value) => value > 0),
          type_pid: categoryIdSchema,
          type_name: z.string().trim().min(1),
        }),
      )
      .min(1),
  })
  .transform((body) =>
    body.class.map((item) => ({
      id: item.type_id,
      parentId: item.type_pid,
      name: item.type_name,
    })),
  )
  .refine((categories) => {
    const ids = new Set(categories.map((item) => item.id));
    const parents = new Set(
      categories.filter((item) => item.parentId === 0).map((item) => item.id),
    );

    return (
      ids.size === categories.length &&
      parents.size > 0 &&
      categories.every(
        (item) => item.parentId === 0 || parents.has(item.parentId),
      )
    );
  }, '分类层级不可用，请检查接口地址');

// 表单提交与本地存储共用接口地址规则。
const sourceUrlSchema = z
  .url({ protocol: /^https?$/, error: '请输入有效的 HTTP 或 HTTPS 接口地址' })
  .transform((value) => new URL(value))
  .refine((url) => url.href.length <= 2048, '接口地址不能超过 2048 个字符')
  .refine((url) => !url.username && !url.password, '接口地址不能包含账号密码');

// 保存前移除查询条件，保留接口本身所需的参数。
export const sourceFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '名称需为 1～80 个字符')
    .max(80, '名称需为 1～80 个字符'),
  url: z
    .string()
    .trim()
    .pipe(sourceUrlSchema)
    .transform((url) => {
      url.hash = '';
      for (const key of ['ac', 'pg', 't', 'ids', 'wd']) {
        url.searchParams.delete(key);
      }
      return url.href;
    }),
});

// 存储读取只接受规范化后的自定义源，ID 与接口地址分别唯一。
export const customSourcesSchema = z
  .array(
    z.object({
      id: z.string().startsWith('custom:'),
      name: z
        .string()
        .max(80)
        .refine((value) => !!value.trim()),
      url: sourceUrlSchema
        .refine(
          (url) =>
            !url.hash &&
            !['ac', 'pg', 't', 'ids', 'wd'].some((key) =>
              url.searchParams.has(key),
            ),
        )
        .transform((url) => url.href),
    }),
  )
  .refine(
    (items) =>
      new Set(items.map((item) => item.id)).size === items.length &&
      new Set(items.map((item) => item.url)).size === items.length,
  );
