import { View, Text } from "react-native";
import Icon from "./icon";

interface Props {
  title?: string;
}

export default function ({ title }: Props) {
  return (
    <View className="wh-full flex-center gap-4">
      <Icon name="empty" size={100} color="rgba(255,255,255,0.3)" />

      <Text className="text-main-dark2 text-lg">
        {title || "暂无更多内容..."}
      </Text>
    </View>
  );
}
