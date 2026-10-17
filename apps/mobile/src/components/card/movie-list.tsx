import { MovieInfo } from "@/type";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import Img from "../img";
import { formatRemarks, formatSub } from "@/utils/format";
import { LinearGradient } from "expo-linear-gradient";
import { addHistory } from "@/stores/useHistoryStore";
import eventEmitter from "@/hooks/eventEmitter";

type Props = {
  data: MovieInfo;
};

export default function ({ data }: Props) {
  const handlePress = () => {
    const info = addHistory(data);

    eventEmitter.emit("openPlayer", info);

    router.push("/player");
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <Base data={data} />
    </TouchableOpacity>
  );
}

type BaseProps = {
  data: MovieInfo;
};

function Base({ data }: BaseProps) {
  return (
    <View className="flex-row items-center gap-3">
      {/* 图片 */}

      <View
        className="relative rounded-lg overflow-hidden aspect-3/4"
        style={{
          width: 100,
        }}
      >
        <Img src={data.pic} className="flex-1" />

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
      <View className="flex-1 gap-2.5">
        {/* 标题 */}
        <Text className="font-medium text-xl text-main" numberOfLines={1}>
          {data.name}
        </Text>

        {/* 副标题 */}
        <View className="flex-row items-center gap-2">
          <Text className="text-sub">{formatSub(data.year)}</Text>

          <Text className="text-main-dark2">|</Text>

          <Text className="text-sub">{formatSub(data.area)}</Text>

          <Text className="text-main-dark2">|</Text>

          <Text className="text-sub">{formatSub(data.lang)}</Text>
        </View>

        {/* 简介 */}
        <Text
          className="mt-auto flex-row gap-1 text-sub tracking-wide"
          numberOfLines={2}
        >
          <Text className="text-main-dark2 text-xl">“</Text>

          {data.content || "暂无剧情简介......"}

          <Text className="text-main-dark2 text-xl">”</Text>
        </Text>
      </View>
    </View>
  );
}
