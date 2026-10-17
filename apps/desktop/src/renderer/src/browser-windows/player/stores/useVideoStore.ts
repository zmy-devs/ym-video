import { getValue } from "@/utils/value";
import { playerRef, videoRef } from "./useEl";
import { useEventListener, useStorage } from "@vueuse/core";

export const useVideoStore = defineStore("player-video", () => {
  //播放状态
  const isPlay = ref(true);

  //是否加载
  const isLoading = ref(false);

  //音量
  const volume = useStorage("volume", 100);

  //倍速
  const rate = ref(1);

  //倍速提示
  const rateTip = ref(false);

  //是否全屏
  const isFullscreen = ref(false);

  //设置播放
  const setPlay = (value?: boolean) => {
    if (!videoRef.value) {
      return;
    }

    isPlay.value = value ?? !isPlay.value;

    if (isPlay.value) {
      videoRef.value.play();
      return;
    }

    videoRef.value.pause();
  };

  //设置加载
  const setLoading = (value: boolean) => {
    isLoading.value = value;
  };

  //设置音量
  const setVolume = (value: number | ((volume: number) => number)) => {
    if (!videoRef.value) {
      return;
    }

    //设置音量
    volume.value = Math.min(100, Math.max(0, getValue(value, volume.value)));

    //设置视频音量
    videoRef.value.volume = volume.value / 100;
  };

  //设置倍速
  const setRate = (value: number | ((rate: number) => number)) => {
    if (!videoRef.value) {
      return;
    }

    rate.value = getValue(value, rate.value);

    videoRef.value.playbackRate = rate.value;
  };

  //开启倍速
  const openRate = () => {
    if (rateTip.value) {
      return;
    }

    rateTip.value = true;

    setRate(rate => rate * 3);
  };

  //重置倍速
  const resetRate = () => {
    if (!rateTip.value) {
      return;
    }

    rateTip.value = false;

    setRate(rate => rate / 3);
  };

  //设置全屏
  const setFullscreen = (value?: boolean) => {
    if (!playerRef.value) {
      return;
    }

    const shouldEnter = value ?? !isFullscreen.value;

    if (shouldEnter) {
      playerRef.value.requestFullscreen();

      return;
    }

    document.exitFullscreen();
  };

  //监视全屏状态
  useEventListener(document, "fullscreenchange", () => {
    isFullscreen.value = Boolean(document.fullscreenElement);
  });

  return {
    isPlay,
    isLoading,
    volume,
    rate,
    rateTip,
    isFullscreen,
    setPlay,
    setLoading,
    setVolume,
    setRate,
    openRate,
    resetRate,
    setFullscreen,
  };
});
