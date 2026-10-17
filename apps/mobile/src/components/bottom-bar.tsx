import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  LayoutChangeEvent,
} from "react-native";
import BlurView from "./blur-view";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import Icon, { IconName } from "./icon";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type Props = {
  leftOption: {
    icon: IconName;
    onPress?: () => void;
  };

  rightOption: {
    icon: IconName;
    onPress?: () => void;
  };

  tabs: {
    label: string;
    onPress?: () => void;
  }[];
};

export default function ({ leftOption, rightOption, tabs }: Props) {
  const [tabWidth, setTabWidth] = useState(0);

  const translateX = useSharedValue(0);

  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handlePress = (index: number) => {
    translateX.value = withSpring(tabWidth * index, {
      stiffness: 220,
      damping: 22,
      mass: 1,
    });
  };

  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    const width = (nativeEvent.layout.width - 8) / tabs.length;

    setTabWidth(width);
  };

  return (
    <View className="w-screen h-1/3 px-6 pb-6 justify-end absolute bottom-0 left-0">
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.4)"]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View
        pointerEvents="auto"
        className="flex-row justify-between items-center"
        style={{
          height: 40,
        }}
      >
        <BlurView
          className={`h-full rounded-full overflow-hidden aspect-square`}
        >
          <TouchableOpacity
            className="flex-1 flex-center"
            onPress={leftOption.onPress}
          >
            <Icon name={leftOption.icon} size={24} />
          </TouchableOpacity>
        </BlurView>

        <BlurView
          className={`h-full p-1 flex-row rounded-full overflow-hidden`}
          style={{
            width: "55%",
          }}
          onLayout={handleLayout}
        >
          <Animated.View
            className="h-full absolute inset-1 rounded-full"
            style={[
              {
                width: tabWidth,
                backgroundColor: "#3B3B3B",
              },
              sliderStyle,
            ]}
          />

          {tabs.map((item, index) => (
            <BottomBarItem
              key={index}
              label={item.label}
              onPress={() => {
                item.onPress && item.onPress();
                handlePress(index);
              }}
            />
          ))}
        </BlurView>

        <BlurView
          className={`h-full rounded-full overflow-hidden aspect-square`}
        >
          <TouchableOpacity
            className="flex-1 flex-center"
            onPress={rightOption.onPress}
          >
            <Icon name={rightOption.icon} size={24} />
          </TouchableOpacity>
        </BlurView>
      </View>
    </View>
  );
}

interface BottomBarItemOption {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function BottomBarItem({
  label,

  onPress,
}: BottomBarItemOption) {
  return (
    <Pressable className="flex-1 flex-center rounded-full" onPress={onPress}>
      <Text className="text-white">{label}</Text>
    </Pressable>
  );
}
