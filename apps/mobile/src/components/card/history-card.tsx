import { View, Text, TouchableOpacity } from "react-native";
import Img from "../img";
import { HistoryInfo } from "@/type";
import { LinearGradient } from "expo-linear-gradient";
import { formatRemarks } from "@/utils/format";
import { useMemo } from "react";
import { router } from "expo-router";
import eventEmitter from "@/hooks/eventEmitter";

type Props = {
  data: HistoryInfo;
};

export default function ({ data }: Props) {
  const handlePlay = () => {
    eventEmitter.emit("openPlayer", data);

    router.push("/player");
  };

  return (
    <TouchableOpacity onPress={handlePlay}>
      <HistoryCard data={data} />
    </TouchableOpacity>
  );
}

function HistoryCard({ data }: Props) {
  const progress = useMemo(() => {
    if (!data.progress[data.history]) {
      return 0;
    }

    return (
      Math.floor(
        (data.progress[data.history].currentTime /
          data.progress[data.history].duration) *
          100
      ) || 0
    );
  }, [data.progress[data.history]]);

  return (
    <View
      className="gap-1"
      style={{
        width: 110,
      }}
    >
      <View className="relative rounded-xl overflow-hidden aspect-3/4">
        <Img src={data.pic} className="flex-1" />

        <LinearGradient
          colors={["transparent", "transparent", "rgba(0,0,0,0.6)"]}
          locations={[0, 0.8, 1]}
          className="justify-end absolute inset-0"
        >
          <View className="px-2 items-end">
            <Text className=" text-white text-xs">
              {formatRemarks(data.remarks)}
            </Text>
          </View>

          <View
            className="h-1 bg-main rounded-full"
            style={{
              width: `${progress}%`,
            }}
          ></View>
        </LinearGradient>
      </View>

      <View className="w-full px-1">
        <Text numberOfLines={1} className="text-main font-medium">
          {data.name}
        </Text>
      </View>
    </View>
  );
}
