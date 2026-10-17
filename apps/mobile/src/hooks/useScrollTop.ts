import { useCallback, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

export function useScrollTop(threshold = 0) {
  const [isTop, setIsTop] = useState(true);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      setIsTop(offsetY <= threshold);
    },
    [threshold]
  );

  return { isTop, onScroll };
}
