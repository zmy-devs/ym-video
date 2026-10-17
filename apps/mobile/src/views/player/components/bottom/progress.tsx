import { formatSeconde } from "@/utils/format";
import { useState } from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSnapshot } from "valtio";
import {
  progressDerivedState,
  progressState,
  seekTo,
} from "../../stores/useProgressStore";

export default function () {
  const { duration, currentTime } = useSnapshot(progressState);

  return (
    <View className="pb-2 gap-1">
      <Bar />

      <View className="flex-row justify-between">
        <Text
          className="text-main"
          style={{
            textShadowColor: "#000",
            textShadowRadius: 2,
          }}
        >
          {formatSeconde(currentTime)}
        </Text>

        <Text
          className="text-main"
          style={{
            textShadowColor: "#000",
            textShadowRadius: 2,
          }}
        >
          {formatSeconde(duration)}
        </Text>
      </View>
    </View>
  );
}

//进度条
function Bar() {
  const { duration } = useSnapshot(progressState);

  //进度条宽度
  const [width, setWidth] = useState(0);

  //跳转
  const handleSeek = ({ nativeEvent }: GestureResponderEvent) => {
    const { locationX } = nativeEvent;

    const seconde = (locationX / width) * duration;

    seekTo(seconde);
  };

  //获取宽度
  const onLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    setWidth(nativeEvent.layout.width);
  };

  return (
    <Pressable
      className="w-full h-2 justify-center relative rounded-full"
      style={{
        backgroundColor: "rgba(100,100,100,0.8)",
        boxShadow: [
          {
            offsetX: 0,
            offsetY: 1,
            blurRadius: 5,
            spreadDistance: 0,
            color: "rgba(0,0,0,0.5)",
          },
        ],
      }}
      onPress={handleSeek}
      onLayout={onLayout}
    >
      <PlayBar />

      <SeekTip />
    </Pressable>
  );
}

//播放条
function PlayBar() {
  const { currentTimePrecent } = useSnapshot(progressDerivedState);

  return (
    <View className="flex-1 rounded-full overflow-hidden">
      <View
        className="h-full bg-main"
        style={{
          width: `${currentTimePrecent}%`,
        }}
      />
    </View>
  );
}

//跳转提示
function SeekTip() {
  const { seekPrecent, seekVisible, duration } = useSnapshot(progressState);

  return (
    <>
      <View
        className="w-0.5 h-4 absolute bg-main"
        style={{
          left: `${seekPrecent * 100}%`,
          opacity: seekVisible ? 100 : 0,
        }}
      />

      <Text
        className="absolute -translate-x-1/2 -translate-y-full text-main"
        style={{
          left: `${seekPrecent * 100}%`,
          opacity: seekVisible ? 100 : 0,
          textShadowColor: "#000",
          textShadowRadius: 2,
        }}
      >
        {formatSeconde(seekPrecent * duration)}
      </Text>
    </>
  );
}
