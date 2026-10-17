import { proxy } from "valtio";
import { derive } from "derive-valtio";
import { videoRef } from "./useEl";

export const progressState = proxy({
  //进度条提示
  seekVisible: false,

  //进度条百分比
  seekPrecent: 0,

  //当前播放进度
  currentTime: 0,

  //总进度
  duration: 0,
});

export const progressDerivedState = derive({
  //播放进度百分比
  currentTimePrecent: get => {
    const state = get(progressState);

    return (state.currentTime / state.duration) * 100 || 0;
  },
});

//重置播放进度
export const resetProgress = () => {
  progressState.currentTime = 0;
  progressState.duration = 0;
};

//显示进度条提示
export const showSeek = () => {
  progressState.seekVisible = true;
};

//隐藏进度条提示
export const hideSeek = () => {
  progressState.seekVisible = false;
};

//更新播放进度
export const setSeek = (ratio: number) => {
  const currentRatio = progressState.currentTime / progressState.duration;

  const newRatio = currentRatio + ratio / 4;

  progressState.seekPrecent = Math.max(0, Math.min(1, newRatio));
};

//跳转到
export const seekTo = (seconde: number) => {
  progressState.currentTime = seconde;

  videoRef.current?.seek(seconde);
};
