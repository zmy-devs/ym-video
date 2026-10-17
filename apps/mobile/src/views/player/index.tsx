import { enterFullscreen, exitFullscreen } from "@/utils/fullscreen";
import { saveHistory } from "@player/stores/useHistoryStore";
import { useEffect } from "react";
import { AppState, View } from "react-native";
import Event from "./components/event";
import Tip from "./components/tip";
import Video from "./components/video";
import { showControl } from "./stores/useControlStore";
import Top from "./components/top";
import Bottom from "./components/bottom";
import Rate from "./components/rate";
import { restoreSystemBrightnessAsync } from "expo-brightness";
import { resetProgress } from "./stores/useProgressStore";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { scaleSharedValue } from "./stores/useVideoStore";
import EpisodeList from "./components/episode-list";

export default function () {
  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ scale: scaleSharedValue.value }],
  }));

  //初始化
  useEffect(() => {
    //清空进度条
    resetProgress();

    //进入全屏
    enterFullscreen();

    //展示控件
    showControl();

    //进入后台保存数据
    const removeChange = AppState.addEventListener("change", state => {
      if (state != "background") {
        return;
      }

      saveHistory();
    });

    return () => {
      //移除监听
      removeChange.remove();

      //还原亮度
      restoreSystemBrightnessAsync();

      exitFullscreen();

      saveHistory();
    };
  }, []);

  return (
    <View className="flex-1 flex-center relative bg-black">
      <EpisodeList />

      <Rate />

      <Top />

      <Bottom />

      <Tip />

      <Event />

      <Animated.View className="wh-full" style={animatedStyles}>
        <Video />
      </Animated.View>
    </View>
  );
}
