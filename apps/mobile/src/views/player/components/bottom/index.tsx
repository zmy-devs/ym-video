import Controls from "./controls";
import Progress from "./progress";
import { View } from "react-native";
import { useSnapshot } from "valtio";
import {
  progressDerivedState,
  progressState,
} from "../../stores/useProgressStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { controlStore } from "../../stores/useControlStore";

export default function () {
  const { visible } = useSnapshot(controlStore);
  const { seekVisible } = useSnapshot(progressState);
  const { left, right } = useSafeAreaInsets();

  const padding = Math.max(left, right, 24);

  const { currentTimePrecent } = useSnapshot(progressDerivedState);

  return (
    <View
      className="w-full  absolute bottom-0 left-0 z-30"
      style={{
        paddingLeft: padding,
        paddingRight: padding,
      }}
    >
      {visible ? (
        <View className="gap-3">
          {!seekVisible && <Controls />}

          <Progress />
        </View>
      ) : (
        <View
          className="h-0.5 bg-main rounded-full"
          style={{
            width: `${currentTimePrecent}%`,
          }}
        ></View>
      )}
    </View>
  );
}
