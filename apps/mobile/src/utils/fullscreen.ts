import { lockAsync, OrientationLock } from "expo-screen-orientation";
import { SystemBars } from "react-native-edge-to-edge";

//进入全屏
export const enterFullscreen = async () => {
  await lockAsync(OrientationLock.LANDSCAPE);
  SystemBars.setHidden({ statusBar: true, navigationBar: true });
};

//退出全屏
export const exitFullscreen = async () => {
  await lockAsync(OrientationLock.DEFAULT);
  SystemBars.setHidden({ statusBar: false, navigationBar: false });
};
