import React, { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";

interface Props {
  active?: boolean;
  height: number;
  onPress?: () => void;
}

export default function Switch({ active, height, onPress }: Props) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    // 滑块移动动画
    translateX.value = withTiming(active ? height * 0.8 : 0, { duration: 220 });
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  return (
    <Pressable
      className={`rounded-full ${active ? "bg-primary" : "bg-444"}`}
      style={{
        padding: 2.5,
        width: height * 1.8,
        height,
      }}
      onPress={onPress}
    >
      <Animated.View
        className={`h-full aspect-square rounded-full bg-white elevation`}
        style={animatedStyle}
      />
    </Pressable>
  );
}
