import useVisible from "@/hooks/useVisible";
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSnapshot } from "valtio";
import eventEmitter from "@/hooks/eventEmitter";
import Icon from "@/components/icon";
import { Loading } from "@/components/loading";
import { resetScale, setPlay, videoStore } from "../stores/useVideoStore";

const tpyeMap = {
  volume: <VolumeTip />,
  brightness: <BrightnessTip />,
};

export default function () {
  const { isLoading } = useSnapshot(videoStore);

  const { visible, show } = useVisible(1000);
  const [type, setType] = useState<keyof typeof tpyeMap>("volume");

  useEffect(() => {
    const handleVolume = eventEmitter.on("player:volume:show", () => {
      setType("volume");

      show();
    });

    const handleBrightness = eventEmitter.on("player:brightness:show", () => {
      setType("brightness");

      show();
    });

    return () => {
      handleVolume.remove();

      handleBrightness.remove();
    };
  }, []);

  return (
    <View className="flex-center absolute inset-0 z-20">
      <RateTip />

      {isLoading && <Loading color="#fff" />}

      {visible && tpyeMap[type]}

      <PlayTip />

      <ScaleTip />
    </View>
  );
}

type BaseTipProps = {
  data: number;
  iconComponent: React.ReactNode;
};

function BaseTip({ data, iconComponent }: BaseTipProps) {
  return (
    <View
      className="w-1/4 flex-row items-center absolute top-4 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "rgba(110,110,110,0.8)",
        boxShadow: [
          {
            offsetX: 0,
            offsetY: 0,
            blurRadius: 4,
            spreadDistance: 0,
            color: "rgba(0,0,0,0.5)",
          },
        ],
      }}
    >
      <View
        className="h-full absolute left-0 bottom-0 bg-white"
        style={{
          width: `${data}%`,
        }}
      />

      <View className="m-3">{iconComponent}</View>
    </View>
  );
}

function VolumeTip() {
  const { volume } = useSnapshot(videoStore);

  const getIconName = useMemo(() => {
    if (volume == 0) {
      return "volumeOff";
    }

    if (volume > 0 && volume < 50) {
      return "volume1";
    }

    return "volume2";
  }, [volume]);

  return (
    <BaseTip
      data={volume}
      iconComponent={
        <Icon name={getIconName} size={20} color="#666" strokeWidth={0.5} />
      }
    />
  );
}

function BrightnessTip() {
  const { brightness } = useSnapshot(videoStore);

  return (
    <BaseTip
      data={brightness}
      iconComponent={
        <Icon name="brightness" size={20} color="#666" strokeWidth={0.5} />
      }
    />
  );
}

function RateTip() {
  const { rateTip } = useSnapshot(videoStore);

  if (!rateTip) {
    return null;
  }

  return (
    <View
      className="px-4 py-2 absolute top-4 rounded-xl"
      style={{
        backgroundColor: "rgba(25,25,25,0.5)",
      }}
    >
      <Text className="text-main">倍速播放中...</Text>
    </View>
  );
}

function PlayTip() {
  const { isPlay } = useSnapshot(videoStore);

  //点击播放
  const handlePress = () => {
    setPlay(true);
  };

  if (isPlay) {
    return null;
  }

  return (
    <Pressable className="absolute" onPress={handlePress}>
      <Icon
        name="playFill"
        size={80}
        color="#fff"
        stroke="rgba(0,0,0,0.02)"
        strokeWidth={0.5}
      />
    </Pressable>
  );
}

function ScaleTip() {
  const { scale } = useSnapshot(videoStore);

  if (scale == 1) {
    return null;
  }

  return (
    <Pressable
      className="px-4 py-2 absolute bottom-4 rounded-xl"
      style={{
        backgroundColor: "rgba(25,25,25,0.5)",
      }}
      onPress={resetScale}
    >
      <Text className="text-main">还原屏幕</Text>
    </Pressable>
  );
}
