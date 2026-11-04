import { EventBus } from '@ym-video/ui/lib/event-bus';
import type { ConfirmDialogOptions } from '@ym-video/ui/lib/confirm';

// 定义事件到函数类型的映射，弹窗参数由业务事件约束。
type EventMap = {
  'player-episodes:show': [];
  'source:show': [sourceId?: string];
  'source-switcher:focus': [];
  'search:show': [];
  'search:toggle': [];
  'settings:show': [];
  'confirm:show': [options: ConfirmDialogOptions];
  'dialogs:close': [];
};

// 全局事件总线
export const eventBus = new EventBus<EventMap>();
