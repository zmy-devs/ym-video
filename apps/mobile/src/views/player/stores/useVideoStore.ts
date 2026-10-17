import { proxy } from "valtio";
import { getValue } from "@/utils/value";
import { useSharedValue } from "react-native-reanimated";
import { setBrightnessAsync } from "expo-brightness";

export const scaleSharedValue = useSharedValue(1);

export const videoStore = proxy({
  //播放状态
  isPlay: true,

  //是否加载
  isLoading: false,

  //音量
  volume: 100,

  //倍速
  rate: 1,

  //倍速提示
  rateTip: false,

  //缩放
  scale: 1,

  //亮度
  brightness: 50,
});

//设置播放
export const setPlay = (value?: boolean) => {
  videoStore.isPlay = value ?? !videoStore.isPlay;
};

//设置加载
export const setLoading = (value: boolean) => {
  videoStore.isLoading = value;
};

//设置音量
export const setVolume = (value: number | ((volume: number) => number)) => {
  videoStore.volume = Math.min(
    100,
    Math.max(0, getValue(value, videoStore.volume))
  );
};

//设置倍速
export const setRate = (value: number | ((rate: number) => number)) => {
  videoStore.rate = getValue(value, videoStore.rate);
};

//开启倍速
export const openRate = () => {
  if (videoStore.rateTip) {
    return;
  }

  videoStore.rateTip = true;

  setRate(rate => rate * 3);
};

//重置倍速
export const resetRate = () => {
  if (!videoStore.rateTip) {
    return;
  }

  videoStore.rateTip = false;

  setRate(rate => rate / 3);
};

//设置缩放
export const setScale = (scale: number) => {
  videoStore.scale = scale;
};

//还原缩放
export const resetScale = () => {
  videoStore.scale = 1;
  scaleSharedValue.value = 1;
};

//设置亮度
export const setBrightness = (delta: number) => {
  videoStore.brightness = Math.min(
    100,
    Math.max(0, videoStore.brightness - delta)
  );

  setBrightnessAsync(videoStore.brightness / 100);
};
