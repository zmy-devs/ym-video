import { toast, type ExternalToast } from 'vue-sonner';

// 提示配置沿用组件库，位置统一固定为屏幕顶部居中。
type ToastOptions = Omit<ExternalToast, 'position'>;

// 显示成功提示并返回提示标识。
export const successToast = (message: string, options?: ToastOptions) =>
  toast.success(message, { ...options, position: 'top-center' });

// 显示错误提示并返回提示标识。
export const errorToast = (message: string, options?: ToastOptions) =>
  toast.error(message, { ...options, position: 'top-center' });

// 显示信息提示并返回提示标识。
export const infoToast = (message: string, options?: ToastOptions) =>
  toast.info(message, { ...options, position: 'top-center' });
