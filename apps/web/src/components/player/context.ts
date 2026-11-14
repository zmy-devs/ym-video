import type { Ref } from 'vue';
import { createContext } from 'reka-ui';
import type { PlayerController } from './types.ts';
import type { useControls } from './composables/use-controls.ts';
import type { useGestures } from './composables/use-gestures.ts';
import type { useSeeking } from './composables/use-seeking.ts';

// 播放器子组件直接消费当前页面的媒体与交互状态。
export const [usePlayerContext, providePlayerContext] = createContext<{
  player: PlayerController;
  controls: ReturnType<typeof useControls>;
  gestures: ReturnType<typeof useGestures>;
  progress: ReturnType<typeof useSeeking>;
  holdingRate: Ref<boolean>;
}>('Player');
