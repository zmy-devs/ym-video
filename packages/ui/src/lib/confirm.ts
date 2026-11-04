// 确认弹窗只接收本次操作与展示信息，不依赖具体页面。
export interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  pendingText?: string;
  onConfirm: (signal: AbortSignal) => void | Promise<void>;
  onClose?: () => void;
  returnFocus?: () => HTMLElement | null;
}
