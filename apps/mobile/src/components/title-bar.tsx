import { router } from "expo-router";
import { ReactNode } from "react";
import {
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./icon";

type Props = {
  title?: string;
  titleShow?: boolean;
  blur?: boolean;
  style?: StyleProp<ViewStyle>;
  content?: ReactNode;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  boxShadow?: boolean;

  minHeight?: number;
  height?: number;
  maxHeight?: number;
};

export default function ({
  title,
  titleShow = true,
  content,
  leftContent,
  rightContent,
  boxShadow = true,

  height = 48,
}: Props) {
  const { top } = useSafeAreaInsets();

  return (
    <View
      className={`w-screen z-10`}
      style={[
        boxShadow && {
          boxShadow: [
            {
              offsetX: 0,
              offsetY: 0,
              blurRadius: 5,
              spreadDistance: 5,
              color: "rgba(0,0,0,0.1)",
            },
          ],
        },
      ]}
    >
      <View className="shrink-0" style={{ height: top }}></View>

      <View
        className="flex-row"
        style={{
          height,
        }}
      >
        {(leftContent || rightContent) && (
          <View className="h-full flex-row items-center aspect-square">
            {leftContent}
          </View>
        )}

        <View className="flex-1 flex-row flex-center">
          {titleShow &&
            (content || <Text className="text-main text-xl">{title}</Text>)}
        </View>

        {(leftContent || rightContent) && (
          <View className="h-full flex-row items-center aspect-square">
            {rightContent}
          </View>
        )}
      </View>
    </View>
  );
}

type BackProps = {
  className?: string;
  onPress?: () => void;
};

export function BackControl({ className, onPress }: BackProps) {
  const back = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    back();
  };

  return (
    <TouchableOpacity
      className={`h-full flex-center rounded-full aspect-square ${className}`}
      onPress={handlePress}
    >
      <Icon
        name="back"
        size={18}
        strokeWidth={0.5}
        className="translate-x-1/6"
        style={{
          transform: [
            {
              translateX: "14%",
            },
          ],
        }}
      />
    </TouchableOpacity>
  );
}
