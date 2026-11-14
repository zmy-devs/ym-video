import { z } from 'zod';

// 搜索表单只提交去除首尾空格后的非空关键词。
export const searchFormSchema = z.object({
  keyword: z.string().trim().min(1, '请输入片名'),
});
