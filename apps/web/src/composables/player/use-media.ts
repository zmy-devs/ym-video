import { computed, onScopeDispose, ref, watch } from 'vue';
import { useEventListener, useStorage } from '@vueuse/core';
import Hls from 'hls.js';
import { FilteredPlaylistLoader } from '../../services/hls.ts';
import { errorToast, infoToast, storageError } from '@ym-video/ui/lib/toast';

// 播放阶段互斥，失败消息只属于错误阶段。
type MediaState =
  | { status: 'loading' | 'buffering' | 'playing' | 'paused' }
  | { status: 'error'; message: string };

// 管理媒体元素、HLS 生命周期和浏览器播放能力。
export const useMedia = () => {
  // 页面提供媒体元素和全屏容器。
  const video = ref<HTMLVideoElement | null>(null);
  const container = ref<HTMLElement | null>(null);

  // 界面状态统一由媒体事件和当前加载任务更新。
  const state = ref<MediaState>({ status: 'loading' });
  const status = computed(() => state.value.status);
  const error = computed(() =>
    state.value.status === 'error' ? state.value.message : '',
  );

  // 控制栏展示当前时间、有效时长和播放倍速。
  const currentTime = ref(0);
  const duration = ref(0);
  const rate = ref(1);
  const volume = useStorage('ym-video:volume', 1, undefined, {
    onError: () => storageError('本地设置'),
    serializer: {
      read: (raw) => {
        const value = Number(raw);
        return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 1;
      },
      write: String,
    },
  });
  const fullscreen = ref(false);
  const pipAvailable = document.pictureInPictureEnabled;

  // 每次换片或切集销毁上一份媒体任务。
  let hls: Hls | undefined;
  let revision = 0;
  let mediaReady = false;
  let resumeTime = 0;

  // 当前媒体加载失败后保留明确的重试入口。
  const fail = (message: string) => {
    state.value = { status: 'error', message };
    video.value?.pause();
  };

  // 停止旧媒体并重置当前集的显示值。
  const reset = () => {
    revision++;
    mediaReady = false;
    hls?.destroy();
    hls = undefined;
    video.value?.pause();
    video.value?.removeAttribute('src');
    video.value?.load();
    currentTime.value = 0;
    duration.value = 0;
    state.value = { status: 'loading' };
  };

  // 自动播放被阻止时保留手动播放入口，旧任务结果不会覆盖新媒体。
  const play = async () => {
    const element = video.value;
    const request = revision;

    if (!element || status.value === 'error') {
      return;
    }

    try {
      await element.play();
    } catch (cause) {
      if (
        request !== revision ||
        (cause instanceof DOMException && cause.name === 'AbortError')
      ) {
        return;
      }

      if (cause instanceof DOMException && cause.name === 'NotAllowedError') {
        state.value = { status: 'paused' };
        return;
      }

      fail('播放失败，请重试或更换播放源');
    }
  };

  // 播放地址已在接口边界验证，HLS 直接解析原始 URL 的相对路径。
  const load = (url: string, savedTime: number) => {
    reset();
    resumeTime = savedTime;

    const element = video.value;

    if (!element) {
      return;
    }

    if (location.protocol === 'https:' && new URL(url).protocol !== 'https:') {
      fail('该播放地址使用 HTTP，浏览器无法安全播放，请切换播放源');
      return;
    }

    state.value = { status: 'buffering' };
    element.volume = volume.value;
    element.playbackRate = rate.value;

    if (/\.m3u8(?:[?#]|$)/i.test(url) && Hls.isSupported()) {
      hls = new Hls({
        pLoader: FilteredPlaylistLoader,
        maxBufferLength: 60,
        maxBufferSize: 60 * 1024 * 1024,
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          fail(
            data.type === Hls.ErrorTypes.NETWORK_ERROR
              ? '媒体加载失败，请检查网络或切换播放源'
              : '该视频格式无法播放，请重试或切换播放源',
          );
        }
      });
      hls.attachMedia(element);
      hls.loadSource(url);
      return;
    }

    element.src = url;
  };

  // 仅在元数据就绪后捕获真实进度。
  const getProgress = () => {
    const element = video.value;

    if (!element || !mediaReady) {
      return;
    }

    return { currentTime: element.currentTime, duration: duration.value };
  };

  // 暂停和继续播放共用同一个入口。
  const togglePlay = () => {
    if (video.value?.paused) {
      return play();
    }

    video.value?.pause();
  };

  // 进度、倍速和音量只更新当前媒体。
  const seek = (seconds: number) => {
    if (video.value && mediaReady) {
      currentTime.value = Math.max(0, Math.min(seconds, duration.value));
      video.value.currentTime = currentTime.value;
    }
  };

  const setRate = (value: number) => {
    rate.value = value;
    if (video.value) {
      video.value.playbackRate = value;
    }
  };

  const setVolume = (value: number) => {
    volume.value = Math.max(0, Math.min(1, value));
  };

  // 用户音量偏好也同步其他标签页的修改。
  watch(volume, (value) => {
    if (video.value) {
      video.value.volume = value;
    }
  });

  // 浏览器拒绝全屏时在操作边界反馈。
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.fullscreenEnabled && container.value) {
        await container.value.requestFullscreen();
        container.value.focus({ preventScroll: true });
      } else {
        infoToast('当前浏览器不支持全屏');
      }
    } catch {
      errorToast('浏览器未允许全屏');
    }
  };

  // 画中画失败保留当前页面播放。
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

  useEventListener(video, 'loadedmetadata', () => {
    const element = video.value;

    if (!element) {
      return;
    }

    duration.value = Number.isFinite(element.duration) ? element.duration : 0;
    element.currentTime = Math.max(
      0,
      Math.min(resumeTime, Math.max(0, duration.value - 1)),
    );
    currentTime.value = element.currentTime;
    element.playbackRate = rate.value;
    mediaReady = true;
    play();
  });
  useEventListener(video, ['timeupdate', 'seeked'], () => {
    if (video.value && mediaReady && !video.value.seeking) {
      currentTime.value = video.value.currentTime;
    }
  });
  useEventListener(video, ['play', 'playing'], () => {
    if (mediaReady && status.value !== 'error') {
      state.value = { status: 'playing' };
    }
  });
  useEventListener(video, ['pause', 'ended'], () => {
    if (mediaReady && status.value !== 'error') {
      state.value = { status: 'paused' };
    }
  });
  useEventListener(video, 'waiting', () => {
    if (mediaReady && !video.value?.paused && status.value !== 'error') {
      state.value = { status: 'buffering' };
    }
  });
  useEventListener(video, 'canplay', () => {
    if (status.value === 'buffering') {
      state.value = { status: video.value?.paused ? 'paused' : 'playing' };
    }
  });
  useEventListener(video, 'error', () => {
    if (status.value !== 'loading' && video.value?.error) {
      fail('视频无法加载或解码，请重试或切换播放源');
    }
  });
  useEventListener(document, 'fullscreenchange', () => {
    fullscreen.value = Boolean(document.fullscreenElement);
  });
  onScopeDispose(reset);

  return {
    video,
    container,
    status,
    error,
    currentTime,
    duration,
    rate,
    volume,
    fullscreen,
    pipAvailable,
    fail,
    reset,
    load,
    getProgress,
    togglePlay,
    seek,
    setRate,
    setVolume,
    toggleFullscreen,
    togglePip,
  };
};
