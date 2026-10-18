import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// 合并 shadcn-vue 的条件样式和 Tailwind 冲突类。
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
