import { computed, onScopeDispose, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useEventListener } from '@vueuse/core';
import Hls from 'hls.js';
import type { HistoryEntry } from '@/types';
import { getMovies } from '@/services/api';
import { FilteredPlaylistLoader } from '@/services/hls';
import { useHistoryStore } from '@/stores/history';
import { movieKey } from '@/lib/movie';
import { readLocal, writeLocal } from '@/lib/storage';
import { errorToast, infoToast } from '@/utils/toast';

// PC 浏览器播放器状态与生命周期，不依赖窗口消息。
export const usePlayer = () => {
  // 当前页面路径和查询参数。
  const route = useRoute();

  // 页面导航与返回操作。
  const router = useRouter();

  // 当前浏览器的观看历史。
  const history = useHistoryStore();

  // 浏览器原生视频元素。
  const video = ref<HTMLVideoElement | null>(null);

  // 播放器全屏及弹层挂载容器。
  const container = ref<HTMLElement | null>(null);

  // 当前影片、选集和播放进度。
  const entry = ref<HistoryEntry | null>(null);

  // 首次加载或刷新时的请求状态。
  const loading = ref(true);

  // 媒体缓冲状态。
  const buffering = ref(false);

  // 当前操作失败时的提示。
  const error = ref('');

  // 媒体实际播放状态。
  const playing = ref(false);

  // 当前播放秒数。
  const currentTime = ref(0);

  // 当前媒体的有效总时长。
  const duration = ref(0);

  // 用户选择的播放倍速。
  const rate = ref(1);

  // 从本地设置恢复的音量。
  const volume = ref(
    readLocal(
      'volume',
      1,
      (value): value is number =>
        typeof value === 'number' && value >= 0 && value <= 1,
    ),
  );

  // 浏览器当前全屏状态。
  const fullscreen = ref(false);

  // 长按右方向键期间向界面显示临时倍速提示。
  const holdingRate = ref(false);

  // 浏览器是否支持画中画。
  const pipAvailable =
    'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;

  // 当前选中的媒体地址。
  const episode = computed(() => entry.value?.episodes[entry.value.episode]);

  // 当前媒体的 HLS 加载实例。
  let hls: Hls | undefined;

  // 用于取消已失效请求。
  let controller: AbortController | undefined;

  // 元数据就绪后才允许保存真实进度。
  let mediaReady = false;

  // 阻止卸载后的异步回调更新页面。
  let disposed = false;

  // 长按方向键的判定计时器。
  let pressTimer: ReturnType<typeof setTimeout> | undefined;

  // 长按前的播放倍速，用于松开后恢复。
  let heldRate: number | undefined;

  // 最后一次切集操作序号。
  let episodeRequest = 0;

  // 只保存当前媒体的真实进度，零秒也可覆盖旧进度。
  const save = () => {
    // 本次操作读取的数据。
    const value = entry.value;
    if (!value) {
      return Promise.resolve();
    }
    if (mediaReady && video.value) {
      value.progress[String(value.episode)] = {
        currentTime: video.value.currentTime,
        duration: Number.isFinite(video.value.duration)
          ? video.value.duration
          : 0,
      };
    }
    value.watchedAt = Date.now();
    return history.save(value);
  };

  // 清理旧媒体后才能进入新影片或新集数。
  const stopMedia = () => {
    mediaReady = false;
    hls?.destroy();
    hls = undefined;
    video.value?.pause();
    video.value?.removeAttribute('src');
    video.value?.load();
    playing.value = false;
    currentTime.value = 0;
    duration.value = 0;
    buffering.value = false;
  };

  // 自动播放可能被浏览器拒绝，此时保留手动播放入口。
  const play = async () => {
    if (!video.value) {
      return;
    }
    try {
      await video.value.play();
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        return;
      }
      playing.value = false;
      if (cause instanceof DOMException && cause.name === 'NotAllowedError') {
        return;
      }
      if (!error.value) {
        error.value = '播放失败，请重试或更换资源源';
      }
    }
  };

  // 使用原始 URL 加载，HLS 自行解析所有相对地址。
  const startMedia = () => {
    stopMedia();

    // 当前仍挂载的视频元素。
    const element = video.value;

    // 经过协议验证的媒体地址。
    const url = episode.value?.url;
    if (!element || !url) {
      error.value = '当前影片暂无可播放集数';
      return;
    }
    if (location.protocol === 'https:' && new URL(url).protocol !== 'https:') {
      error.value = '该播放地址使用 HTTP，浏览器无法安全播放，请切换资源源';
      return;
    }
    error.value = '';
    buffering.value = true;
    element.volume = volume.value;
    element.playbackRate = rate.value;
    if (/\.m3u8(?:[?#]|$)/i.test(url) && Hls.isSupported()) {
      hls = new Hls({
        pLoader: FilteredPlaylistLoader,
        maxBufferLength: 60,
        maxBufferSize: 60 * 1024 * 1024,
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) {
          return;
        }
        buffering.value = false;
        error.value =
          data.type === Hls.ErrorTypes.NETWORK_ERROR
            ? '媒体加载失败，可能是网络或跨域限制。请重试或切换资源源。'
            : '该视频格式无法播放，请重试或切换资源源';
      });
      hls.attachMedia(element);
      hls.loadSource(url);
    } else if (
      !/\.m3u8(?:[?#]|$)/i.test(url) ||
      element.canPlayType('application/vnd.apple.mpegurl')
    ) {
      element.src = url;
    } else {
      buffering.value = false;
      error.value = '当前浏览器不支持此视频，请使用新版 Chrome 或 Edge';
    }
  };

  // 路由刷新先恢复本地影片；无历史时按源和影片 ID 查询。
  const loadMovie = async () => {
    episodeRequest++;
    controller?.abort();
    controller = new AbortController();

    // 捕获本次请求的取消信号。
    const signal = controller.signal;
    await save();
    if (signal.aborted || disposed) {
      return;
    }
    stopMedia();
    entry.value = null;
    loading.value = true;
    error.value = '';

    // 当前影片所属的服务端源 ID。
    const sourceId = String(route.params.sourceId);

    // 上游影片 ID，与源 ID 共同标识影片。
    const vodId = String(route.params.vodId);

    // 是否明确要求从头播放当前集。
    const restart = route.query.restart === '1';
    try {
      await history.init();
      if (signal.aborted || disposed) {
        return;
      }
      // 当前浏览器中已有的同源影片记录。
      const old = history.entries.find(
        (item) => item.id === movieKey(sourceId, vodId),
      );

      // 本次操作读取的数据。
      let value: HistoryEntry;
      if (old) {
        value = JSON.parse(JSON.stringify(old));
      } else {
        // 本次异步操作返回结果。
        const result = await getMovies(sourceId, { ids: vodId }, signal);

        // 接口转换后的有效影片。
        const movie = result.movies.find((item) => item.vodId === vodId);
        if (!movie) {
          throw new Error('影片不存在或已下架，请返回选择其他影片');
        }
        value = { ...movie, episode: 0, progress: {}, watchedAt: Date.now() };
      }
      if (signal.aborted || disposed) {
        return;
      }
      value.episode = Math.max(
        0,
        Math.min(value.episode, value.episodes.length - 1),
      );
      if (restart) {
        value.progress[String(value.episode)] = { currentTime: 0, duration: 0 };
      }
      entry.value = value;
      await save();
      if (signal.aborted || disposed) {
        return;
      }
      loading.value = false;
      if (restart) {
        await router.replace({ path: route.path, query: {} });
      }
      if (!signal.aborted && !disposed) {
        startMedia();
      }
    } catch (cause) {
      if (!signal.aborted && !disposed) {
        loading.value = false;
        error.value = cause instanceof Error ? cause.message : '影片加载失败';
      }
    }
  };

  // 切集前保存上一集，取消旧 HLS 请求并从目标集恢复进度。
  const selectEpisode = async (index: number) => {
    if (
      !entry.value ||
      !entry.value.episodes[index] ||
      index === entry.value.episode
    ) {
      return;
    }
    // 当前请求或操作的唯一标识。
    const request = ++episodeRequest;

    // 异步操作开始时的目标影片。
    const target = entry.value;
    await save();
    if (entry.value !== target || disposed || request !== episodeRequest) {
      return;
    }
    stopMedia();
    entry.value.episode = index;
    await save();
    if (!disposed && entry.value === target && request === episodeRequest) {
      startMedia();
    }
  };

  // 元数据就绪后恢复本集进度，然后尝试播放。
  const handleMetadata = () => {
    if (!video.value || !entry.value) {
      return;
    }
    // 浏览器返回的媒体时长。
    const seconds = video.value.duration;
    duration.value = Number.isFinite(seconds) ? seconds : 0;

    // 当前集上次保存的播放位置。
    const saved =
      entry.value.progress[String(entry.value.episode)]?.currentTime ?? 0;
    video.value.currentTime = Math.max(
      0,
      Math.min(saved, Math.max(0, duration.value - 1)),
    );
    video.value.playbackRate = rate.value;
    mediaReady = true;
    play();
  };

  // 手动播放与暂停共用按钮及空格快捷键。
  const togglePlay = () => {
    if (video.value?.paused) {
      return play();
    }
    video.value?.pause();
  };

  // 暂停时同步状态并保存进度。
  const handlePause = () => {
    playing.value = false;
    if (mediaReady) {
      save();
    }
  };

  // 媒体时间变化时更新控制栏。
  const handleTime = () => {
    if (mediaReady && video.value) {
      currentTime.value = video.value.currentTime;
    }
  };

  // 把目标进度限制在有效媒体范围内。
  const seek = (seconds: number) => {
    if (video.value && mediaReady) {
      video.value.currentTime = Math.max(0, Math.min(seconds, duration.value));
    }
  };

  // 同步界面倍速与媒体播放速率。
  const setRate = (value: number) => {
    rate.value = value;
    if (video.value) {
      video.value.playbackRate = value;
    }
  };

  // 调整媒体音量并保存本地设置。
  const setVolume = (value: number) => {
    volume.value = Math.max(0, Math.min(1, value));
    if (video.value) {
      video.value.volume = volume.value;
    }
    writeLocal('volume', volume.value);
  };

  // 浏览器能力失败时给出明确反馈。
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (
        document.fullscreenEnabled &&
        container.value?.requestFullscreen
      ) {
        await container.value.requestFullscreen();
      } else {
        infoToast('当前浏览器不支持全屏');
      }
    } catch {
      errorToast('浏览器未允许全屏');
    }
  };

  // 切换画中画并提示浏览器能力失败。
  const togglePip = async () => {
    if (!pipAvailable || !video.value || !mediaReady) {
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.value.requestPictureInPicture();
      }
    } catch {
      errorToast('当前无法开启画中画，请先播放视频');
    }
  };

  // 长按右键临时三倍速，松开还原；短按快进五秒。
  const releaseRate = () => {
    clearTimeout(pressTimer);
    pressTimer = undefined;
    holdingRate.value = false;
    if (heldRate !== undefined) {
      setRate(heldRate);
      heldRate = undefined;
      return true;
    }
    return false;
  };

  // 操作表单、菜单或选集面板时，不触发播放器快捷键。
  useEventListener(window, 'keydown', (event) => {
    if (
      (event.target instanceof HTMLElement &&
        event.target.closest(
          'input,textarea,button,select,a,[role="slider"],[role="combobox"],[role="option"],[role="listbox"],[role="menu"],[role="dialog"],[contenteditable="true"]',
        )) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }
    if (
      ![' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'f'].includes(
        event.key,
      )
    ) {
      return;
    }
    event.preventDefault();
    if (event.repeat) {
      return;
    }
    if (event.key === ' ') {
      togglePlay();
    }
    if (event.key === 'ArrowLeft') {
      seek(currentTime.value - 5);
    }
    if (event.key === 'ArrowUp') {
      setVolume(volume.value + 0.05);
    }
    if (event.key === 'ArrowDown') {
      setVolume(volume.value - 0.05);
    }
    if (event.key === 'f') {
      toggleFullscreen();
    }
    if (event.key === 'ArrowRight') {
      pressTimer = setTimeout(() => {
        heldRate = rate.value;
        holdingRate.value = true;
        setRate(rate.value * 3);
      }, 300);
    }
  });
  useEventListener(window, 'keyup', (event) => {
    if (event.key === 'ArrowRight' && pressTimer) {
      if (!releaseRate()) {
        seek(currentTime.value + 5);
      }
    }
  });
  useEventListener(window, 'blur', releaseRate);
  useEventListener(document, 'fullscreenchange', () => {
    fullscreen.value = Boolean(document.fullscreenElement);
  });
  useEventListener(document, 'visibilitychange', () => {
    if (document.hidden) {
      releaseRate();
      save();
    }
  });
  useEventListener(window, 'pagehide', save);

  // 播放期间每十秒保存一次进度。
  const interval = setInterval(() => {
    if (mediaReady) {
      save();
    }
  }, 10_000);
  onBeforeRouteLeave(async () => {
    await save();
  });
  watch(() => [route.params.sourceId, route.params.vodId], loadMovie, {
    immediate: true,
  });
  watch(video, (value) => {
    if (value && entry.value && !loading.value) {
      startMedia();
    }
  });
  onScopeDispose(() => {
    disposed = true;
    controller?.abort();
    releaseRate();
    clearInterval(interval);
    save();
    stopMedia();
  });

  return {
    video,
    container,
    entry,
    episode,
    loading,
    buffering,
    error,
    playing,
    currentTime,
    duration,
    rate,
    volume,
    fullscreen,
    holdingRate,
    pipAvailable,
    loadMovie,
    selectEpisode,
    handleMetadata,
    handlePause,
    handleTime,
    togglePlay,
    seek,
    setRate,
    setVolume,
    toggleFullscreen,
    togglePip,
    save,
  };
};
