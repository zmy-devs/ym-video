import useBattery from "@/hooks/useBattery";
import { BatteryState } from "expo-battery";
import { Text, View } from "react-native";

export default function () {
  const { formatBatteryLevel, batteryState } = useBattery();

  return (
    <View className="flex-row items-center " style={{ gap: 1 }}>
      {/* 背景色 */}
      <View
        className="justify-center relative overflow-hidden bg-stone-500"
        style={{
          width: 26,
          height: 14,
          borderRadius: 5,
        }}
      >
        {/* 电池电量 */}
        <Text
          className={`text-sm font-bold absolute left-1/2 -translate-x-1/2 z-10  ${
            batteryState == BatteryState.CHARGING
              ? "text-main"
              : "text-stone-800"
          }`}
        >
          {formatBatteryLevel}
        </Text>

        {/* 覆盖色 */}

        <View
          className={`h-full ${batteryState == BatteryState.CHARGING ? "bg-changing" : "bg-main"}`}
          style={{ width: `${formatBatteryLevel}%` }}
        />
      </View>

      {/* 电池右侧元素 */}
      <View
        className={`w-0.5 rounded-r-full ${
          (formatBatteryLevel == 100 &&
            (batteryState == BatteryState.CHARGING
              ? "bg-changing"
              : "bg-main")) ||
          "bg-stone-500"
        }`}
        style={{
          height: 6,
        }}
      />
    </View>
  );
}
