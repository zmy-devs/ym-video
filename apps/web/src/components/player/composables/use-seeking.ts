import { computed, ref, watch, type ComputedRef } from 'vue';
import type { PlayerController } from '../types.ts';
import { isMobile } from '@/platform';

// 协调画面横滑与进度滑块的暂停、提交和恢复播放。
export const useSeeking = (
  player: PlayerController,
  seekPreview: ComputedRef<number | undefined>,
) => {
  // 进度滑块正在被直接拖动。
  const dragging = ref(false);

  // 横滑与拖动滑块共用进度调整状态。
  const seeking = computed(
    () => dragging.value || seekPreview.value !== undefined,
  );

  // 松手时只恢复调整前正在播放的视频。
  let resumeAfterSeek = false;

  watch(
    seeking,
    (active) => {
      if (!isMobile) {
        return;
      }

      if (active) {
        resumeAfterSeek =
          player.status.value === 'playing' ||
          player.status.value === 'buffering';
        player.video.value?.pause();
      } else if (resumeAfterSeek) {
        resumeAfterSeek = false;
        return player.togglePlay();
      }
    },
    { flush: 'sync' },
  );

  // 单次跳转后继续播放，拖动期间保持暂停。
  const seek = (seconds: number) => {
    player.seek(seconds);
    if (
      player.status.value !== 'playing' &&
      player.status.value !== 'buffering' &&
      !seeking.value
    ) {
      return player.togglePlay();
    }
  };

  return { dragging, seeking, seek };
};
