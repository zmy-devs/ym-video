import { EventBus } from '@ym-video/ui/lib/event-bus';
import type { ConfirmDialogOptions } from '@ym-video/ui/lib/confirm';

// 管理业务的弹窗与列表刷新事件。
type EventMap = {
  'settings:show': [];
  'confirm:show': [options: ConfirmDialogOptions];
  'account:show': [];
  'invitation:show': [];
  'accounts:changed': [];
  'invitations:changed': [];
  'dialogs:close': [];
};
export const eventBus = new EventBus<EventMap>();
