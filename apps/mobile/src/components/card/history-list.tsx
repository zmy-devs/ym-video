import Img from "@/components/img";
import { HistoryInfo } from "@/type";
import { formatRemarks } from "@/utils/format";
import { formatDay } from "@/utils/format";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { Text, View } from "react-native";
import Icon from "../icon";

type Props = {
  data: HistoryInfo;
};

export default function ({ data }: Props) {
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
    <View className="flex-row items-center gap-3">
      {/* 图片 */}

      <View className="relative rounded-lg overflow-hidden">
        <Img
          src={data.pic}
          className="aspect-3/4 "
          style={{
            width: 100,
          }}
        />

        <LinearGradient
          colors={["transparent", "transparent", "rgba(0,0,0,0.6)"]}
          locations={[0, 0.8, 1]}
          className="p-1 justify-end items-end absolute inset-0"
        >
          <Text
            className=" text-white"
            style={{
              fontSize: 10,
            }}
          >
            {formatRemarks(data.remarks)}
          </Text>
        </LinearGradient>
      </View>

      {/* 信息 */}
      <View className="flex-1 gap-3">
        {/* 标题 */}
        <Text className="font-medium text-xl text-main" numberOfLines={1}>
          {data.name}
        </Text>

        <Text className="text-sub">
          {data.episodes[data.history].label} · 观看至{progress}%
        </Text>

        <View className="flex-row  items-center">
          <Icon name="source" color="#888" size={20} className="mr-1" />

          <Text className="text-sub mr-3">{data.source.label}</Text>

          <Text className="text-sub">{formatDay(data.time)}</Text>
        </View>
      </View>
    </View>
  );
}
