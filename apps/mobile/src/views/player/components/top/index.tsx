import { useSafeAreaInsets } from "react-native-safe-area-context";
import Controls from "./controls";
import StatusBar from "./status-bar";
import { View } from "react-native";
import { useSnapshot } from "valtio";
import { controlStore } from "../../stores/useControlStore";

export default function () {
  const { visible } = useSnapshot(controlStore);
  const { left, right } = useSafeAreaInsets();

  const padding = Math.max(left, right, 24);

  return (
    visible && (
      <View
        className="w-full gap-3 absolute top-0 left-0 z-30"
        style={{
          paddingLeft: padding,
          paddingRight: padding,
        }}
      >
        <StatusBar />

        <Controls />
      </View>
    )
  );
}
