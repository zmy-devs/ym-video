import { computed, onBeforeUnmount, onScopeDispose, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useEventListener, watchImmediate } from '@vueuse/core';
import type { HistoryEntry, Movie } from '@/types';
import type { HistoryToken } from '@ym-video/history';
import { getMovies } from '@/services/api';
import { useHistoryStore } from '@/stores/history-store';
import { useLibraryStore } from '@/stores/library-store';
import { isMovieComplete, movieKey } from '@/lib/movie';
import { useMedia } from './player/use-media.ts';

// 编排当前影片、选集和账号历史，媒体及快捷键分别管理自己的生命周期。
export const usePlayer = () => {
  const route = useRoute();
  const router = useRouter();
  const history = useHistoryStore();
  const library = useLibraryStore();
  const media = useMedia();

  // 当前影片和历史写入凭据随路由一起更换。
  const entry = ref<HistoryEntry | null>(null);
  const episode = computed(() => entry.value?.episodes[entry.value.episode]);
  let playbackToken: HistoryToken | null = null;
  let controller: AbortController | undefined;
  let disposed = false;
  let episodeRequest = 0;

  // 只有真实播放或用户操作才推进观看时间。
  const markWatched = (value: HistoryEntry) => {
    value.watchedAt = Math.max(Date.now(), value.watchedAt + 1);
  };

  // 捕获当前媒体进度，元数据就绪前保留历史中的播放位置。
  const captureProgress = () => {
    const value = entry.value;
    const progress = media.getProgress();

    if (!value || !progress) {
      return;
    }

    const key = String(value.episode);
    const previous = value.progress[key];

    if (
      previous?.currentTime !== progress.currentTime ||
      previous.duration !== progress.duration
    ) {
      markWatched(value);
      value.progress[key] = progress;
    }
  };

  // 保存当前账号的影片进度，后台同步由历史数据层负责。
  const save = () => {
    captureProgress();
    return entry.value
      ? history.save(entry.value, playbackToken)
      : Promise.resolve();
  };

  // 使用当前集及其已保存位置启动媒体。
  const startMedia = () => {
    const value = entry.value;

    if (value && episode.value) {
      media.load(
        episode.value.url,
        value.progress[String(value.episode)]?.currentTime ?? 0,
      );
    }
  };

  // 已完结影片使用本机历史，主动重载和连载影片获取最新详情。
  const loadMovie = async (forceRefresh = false) => {
    episodeRequest++;
    controller?.abort();
    controller = new AbortController();

    const signal = controller.signal;

    await save();

    if (signal.aborted) {
      return;
    }

    media.reset();
    entry.value = null;
    playbackToken = null;

    const sourceId = String(route.params.sourceId);
    const vodId = String(route.params.vodId);
    const id = movieKey(sourceId, vodId);
    const restart = route.query.restart === '1';

    try {
      await history.init(id);
      signal.throwIfAborted();
      playbackToken = history.token(id);

      const old = history.entries.find((item) => item.id === id);
      let movie: Movie | undefined = old;

      if (forceRefresh || !old || !isMovieComplete(old)) {
        const source = library.customSources.find(
          (item) => item.id === sourceId,
        );

        if (!source && sourceId.startsWith('custom:')) {
          throw new Error('此设备未添加该播放源，请先添加对应接口');
        }

        const result = await getMovies(
          source ?? { id: sourceId, name: '' },
          { ids: vodId },
          signal,
        );

        movie = result.movies.find((item) => item.vodId === vodId);
      }

      signal.throwIfAborted();

      if (!movie?.episodes.length) {
        throw new Error(
          movie
            ? '当前影片暂无可播放集数'
            : '影片不存在或已下架，请返回选择其他影片',
        );
      }

      // 新详情保留有效集数范围内的历史进度。
      const value: HistoryEntry = {
        ...movie,
        episode: Math.min(old?.episode ?? 0, movie.episodes.length - 1),
        progress: Object.fromEntries(
          Object.entries(old?.progress ?? {})
            .filter(([key]) => Number(key) < movie.episodes.length)
            .map(([key, progress]) => [key, { ...progress }]),
        ),
        watchedAt: old?.watchedAt ?? Date.now(),
      };

      if (restart) {
        value.progress[String(value.episode)] = { currentTime: 0, duration: 0 };
      }

      markWatched(value);
      entry.value = value;
      await save();
      signal.throwIfAborted();

      if (restart) {
        await router.replace({ path: route.path, query: {} });
        signal.throwIfAborted();
      }

      startMedia();
    } catch (cause) {
      if (!signal.aborted) {
        media.fail(cause instanceof Error ? cause.message : '影片加载失败');
      }
    }
  };

  // 切集前提交上一集进度，连续操作只启动最后选中的一集。
  const selectEpisode = async (index: number) => {
    const target = entry.value;

    if (!target?.episodes[index] || index === target.episode) {
      return;
    }

    const request = ++episodeRequest;

    await save();

    if (entry.value !== target || disposed || request !== episodeRequest) {
      return;
    }

    media.reset();
    target.episode = index;
    markWatched(target);
    await save();

    if (!disposed && entry.value === target && request === episodeRequest) {
      startMedia();
    }
  };

  // 结束时先保存末尾进度，再自动播放下一集。
  const handleEnded = async () => {
    await save();

    if (entry.value) {
      await selectEpisode(entry.value.episode + 1);
    }
  };

  watch(media.currentTime, captureProgress);
  watchImmediate([() => route.params.sourceId, () => route.params.vodId], () =>
    loadMovie(),
  );
  watch(media.video, startMedia);
  watch(
    () => history.ownerId,
    (ownerId) => {
      if (playbackToken && playbackToken.ownerId !== ownerId) {
        controller?.abort();
        media.reset();
        entry.value = null;
        playbackToken = null;
        media.fail('账号已切换，请重新打开影片');
      }
    },
    { flush: 'sync' },
  );

  useEventListener(media.video, ['pause', 'seeked'], save);
  useEventListener(media.video, 'ended', handleEnded);
  useEventListener(document, 'visibilitychange', () => {
    if (document.hidden) {
      save();
    }
  });
  useEventListener(window, 'pagehide', save);

  // 播放期间定期写入本地队列，离开路由时等待最后一次保存。
  const interval = setInterval(() => {
    if (media.status.value === 'playing') {
      save();
    }
  }, 10_000);

  onBeforeRouteLeave(async () => {
    await save();
  });
  onBeforeUnmount(save);
  onScopeDispose(() => {
    disposed = true;
    controller?.abort();
    clearInterval(interval);
  });

  return { ...media, media, entry, episode, loadMovie, selectEpisode };
};
