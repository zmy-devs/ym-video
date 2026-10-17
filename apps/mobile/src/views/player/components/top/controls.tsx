import Icon from "@/components/icon";
import { router } from "expo-router";
import { TouchableOpacity, View } from "react-native";

export default function () {
  return (
    <View className="w-full relative">
      <LeftControls />
    </View>
  );
}

//底部左边控件
function LeftControls() {
  //回退
  const handleBack = async () => {
    if (!router.canGoBack()) {
      return;
    }

    router.back();
  };

  return (
    <View className="flex-row items-center">
      <TouchableOpacity className="w-10 h-10 flex-center " onPress={handleBack}>
        <Icon name="back" size={25} strokeWidth={0.5} />
      </TouchableOpacity>
    </View>
  );
}
