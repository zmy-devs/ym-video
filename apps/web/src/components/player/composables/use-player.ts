import { computed, onScopeDispose, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useEventListener, watchImmediate } from '@vueuse/core';
import type { HistoryEntry, Movie } from '@/types/index.ts';
import type { HistoryToken } from '@ym-video/history';
import { getMovies } from '@/services/catalog-client';
import { useHistoryStore } from '@/stores/history-store.ts';
import { useLibraryStore } from '@/stores/library-store.ts';
import { isMovieComplete, movieKey } from '@/utils/movie.ts';
import { useRequest } from '@/composables/use-request';
import { useMedia } from './use-media.ts';

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
  let disposed = false;
  let episodeRequest = 0;

  // 只有真实播放或用户操作才推进观看时间。
  const markWatched = (value: HistoryEntry) => {
    value.watchedAt = Math.max(Date.now(), value.watchedAt + 1);
  };

  // 保存时读取真实进度，元数据就绪前保留原有位置。
  const save = () => {
    const value = entry.value;

    if (!value) {
      return Promise.resolve();
    }

    // 只有播放位置或时长变化才推进观看时间。
    const progress = media.getProgress();
    const key = String(value.episode);
    const previous = value.progress[key];

    if (
      progress &&
      (previous?.currentTime !== progress.currentTime ||
        previous.duration !== progress.duration)
    ) {
      markWatched(value);
      value.progress[key] = progress;
    }

    return history.save(value, playbackToken);
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
  const { execute: loadMovie } = useRequest(
    async (signal, forceRefresh = false) => {
      episodeRequest++;

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
            media.fail();
            return;
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
          media.fail();
          return;
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
          value.progress[String(value.episode)] = {
            currentTime: 0,
            duration: 0,
          };
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
      } catch {
        if (!signal.aborted) {
          media.fail();
        }
      }
    },
  );

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

  // 自动切集由切集流程保存，最后一集结束时保存末尾进度。
  const handleEnded = async () => {
    if (entry.value?.episodes[entry.value.episode + 1]) {
      await selectEpisode(entry.value.episode + 1);
      return;
    }

    await save();
  };

  watchImmediate([() => route.params.sourceId, () => route.params.vodId], () =>
    loadMovie(),
  );
  watch(media.video, startMedia);

  // 暂停、结束、进入后台和离开播放页时保存。
  useEventListener(media.video, 'pause', () => {
    if (media.status.value === 'paused' && !media.video.value?.ended) {
      save();
    }
  });
  useEventListener(media.video, 'ended', handleEnded);
  useEventListener(document, 'visibilitychange', () => {
    if (document.hidden) {
      save();
    }
  });

  onBeforeRouteLeave(async () => {
    await save();
  });
  onScopeDispose(() => {
    disposed = true;
  });

  return { ...media, media, entry, episode, loadMovie, selectEpisode };
};
