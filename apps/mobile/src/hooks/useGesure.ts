import { useRef, useState } from "react";
import { Gesture } from "react-native-gesture-handler";

type Direction = "horizontal" | "vertical";

interface GestureData {
  deltaX: number; // 本次水平增量
  deltaY: number; // 本次垂直增量
}

export const useDeltaPan = (
  cb: (option: GestureData) => void,
  option: UsePanOption
) => {
  const prevX = useRef(0);
  const prevY = useRef(0);
  const [gestureData, setGestureData] = useState<GestureData>({
    deltaX: 0,
    deltaY: 0,
  });

  return usePan(option)
    .onBegin(e => {
      prevX.current = e.translationX;
      prevY.current = e.translationY;
      setGestureData({
        deltaX: 0,
        deltaY: 0,
      });
    })
    .onUpdate(e => {
      const deltaX = e.translationX - prevX.current;
      const deltaY = e.translationY - prevY.current;
      prevX.current = e.translationX;
      prevY.current = e.translationY;

      setGestureData({
        deltaX,
        deltaY,
      });

      cb(gestureData);
    });
};

interface UsePanOption {
  direction: Direction;
  disable?: boolean;
}

//滑动
export const usePan = ({ direction, disable }: UsePanOption) => {
  return Gesture.Pan()
    .runOnJS(true)
    .minPointers(1)
    .maxPointers(1)
    .activeOffsetX(direction == "horizontal" ? [-10, 10] : [-1000, 1000])
    .activeOffsetY(direction == "vertical" ? [-10, 10] : [-1000, 1000])
    .enabled(!disable);
};

//长按
export const useLongPress = () => {
  return Gesture.LongPress().runOnJS(true).minDuration(200);
};

//单击
export const useTap = () => {
  return Gesture.Tap().runOnJS(true);
};

//双击
export const useDoubleTap = () => {
  return Gesture.Tap().runOnJS(true).numberOfTaps(2);
};

//捏合
export const usePinch = () => {
  return Gesture.Pinch().runOnJS(true);
};
