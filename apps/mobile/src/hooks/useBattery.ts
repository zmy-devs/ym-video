import {
  BatteryState,
  addBatteryLevelListener,
  addBatteryStateListener,
  getBatteryLevelAsync,
  getBatteryStateAsync,
} from "expo-battery";
import { useEffect, useMemo, useState } from "react";

export default function () {
  //电池电量
  const [batteryLevel, setBatteryLevel] = useState(1);

  //格式化电池电量
  const formatBatteryLevel = useMemo(() => {
    if (batteryLevel == -1) {
      return 100;
    }

    return Math.floor(batteryLevel * 100);
  }, [batteryLevel]);

  //电池是否充电
  const [batteryState, setBatteryState] = useState<BatteryState>(
    BatteryState.UNPLUGGED
  );

  //初始化
  const init = async () => {
    setBatteryLevel(await getBatteryLevelAsync());

    setBatteryState(await getBatteryStateAsync());
  };

  useEffect(() => {
    init();

    //监听电池电量改变
    const removeBatteryLevelListener = addBatteryLevelListener(
      ({ batteryLevel }) => {
        setBatteryLevel(batteryLevel);
      }
    );

    //监听电池状态改变
    const removeBatteryStateListener = addBatteryStateListener(
      ({ batteryState }) => {
        setBatteryState(batteryState);
      }
    );

    return () => {
      //注销
      removeBatteryLevelListener.remove();
      removeBatteryStateListener.remove();
    };
  }, []);

  return {
    formatBatteryLevel,
    batteryState,
  };
}
