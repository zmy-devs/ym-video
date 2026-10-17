import Battery from "@/components/battery";
import { useNowTime } from "@/hooks/useNowTime";
import { Text, View } from "react-native";

//伪状态栏
export default function () {
  const { time } = useNowTime();

  return (
    <View className="pt-2 flex-row gap-2">
      <Text className=" text-main">{time}</Text>

      <View className="ml-auto flex-row items-center">
        <Battery />
      </View>
    </View>
  );
}
