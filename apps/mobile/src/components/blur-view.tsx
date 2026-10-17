import { BlurView, BlurViewProps } from "expo-blur";
import { PropsWithChildren } from "react";
import { StyleProp, ViewStyle } from "react-native";

type Props = {
  intensity?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  blur?: boolean;
};

export default function ({
  intensity = 100,
  className,
  style,
  children,
  blur = true,

  ...args
}: PropsWithChildren<Props & BlurViewProps>) {
  return (
    <BlurView
      tint="dark"
      experimentalBlurMethod="dimezisBlurView"
      intensity={blur ? intensity : 0}
      className={className}
      style={[
        {
          backgroundColor: "rgba(255,255,255,0.2)",
        },
        style,
      ]}
      {...args}
    >
      {children}
    </BlurView>
  );
}
