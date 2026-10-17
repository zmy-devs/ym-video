import { getValue } from "@/utils/value";
import { videoRef } from "./useEl";

//进度条提示
export const seekVisible = ref(false);

//进度条百分比
export const seekPrecent = ref(0);

//当前播放进度
export const currentTime = ref(0);

//总进度
export const duration = ref(0);

//播放进度百分比
export const currentTimePrecent = computed(() => {
  return (currentTime.value / duration.value) * 100 || 0;
});

//显示进度条提示
export const showSeek = () => {
  seekVisible.value = true;
};

//隐藏进度条提示
export const hideSeek = () => {
  seekVisible.value = false;
};

//跳转到
export const setSeek = (value: number | ((current: number) => number)) => {
  if (!videoRef.value) {
    return;
  }

  const target = getValue(value, videoRef.value.currentTime);

  currentTime.value = Math.max(0, Math.min(target, duration.value));

  videoRef.value.currentTime = currentTime.value;
};

//重置播放进度
export const resetProgress = () => {
  currentTime.value = 0;
  duration.value = 0;
};
