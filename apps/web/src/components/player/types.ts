import type { ComputedRef, Ref } from 'vue';
import type { Episode, HistoryEntry } from '@ym-video/history';
import type { useMedia } from './composables/use-media.ts';

// 播放器页面组合媒体状态、影片切换和观看历史操作。
export type PlayerController = ReturnType<typeof useMedia> & {
  entry: Ref<HistoryEntry | null>;
  episode: ComputedRef<Episode | undefined>;
  loadMovie: (forceRefresh?: boolean) => Promise<void>;
  selectEpisode: (index: number) => Promise<void>;
};
