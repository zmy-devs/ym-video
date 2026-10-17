import { View } from "react-native";
import Icon from "./icon";

type LoadingGlobalProps = {
  mask?: boolean;
};

export function LoadingGlobal({ mask }: LoadingGlobalProps) {
  return (
    <View
      className={`w-screen h-screen flex-center absolute inset-0 ${!mask && "pointer-events-none"}`}
      style={[
        {
          zIndex: 999,
        },
        mask && {
          backgroundColor: "rgba(0,0,0,0.5)",
        },
      ]}
    >
      <Icon
        name="loading"
        size={35}
        color="rgba(255,255,255,0.3)"
        style={{
          animationDuration: 1000,
          animationIterationCount: "infinite",
          animationTimingFunction: "linear",
          animationName: {
            0: {
              transform: [{ rotate: "0deg" }],
            },
            "50%": {
              transform: [{ rotate: "180deg" }],
            },
            "100%": {
              transform: [{ rotate: "360deg" }],
            },
          },
        }}
      />
    </View>
  );
}

type LoadingProps = {
  color?: string;
  size?: number;
};

export function Loading({
  color = "rgba(255,255,255,0.3)",
  size = 35,
}: LoadingProps) {
  return (
    <View className="flex-1 flex-center">
      <Icon
        name="loading"
        size={size}
        color={color}
        style={{
          animationDuration: 1000,
          animationIterationCount: "infinite",
          animationTimingFunction: "linear",
          animationName: {
            0: {
              transform: [{ rotate: "0deg" }],
            },
            "50%": {
              transform: [{ rotate: "180deg" }],
            },
            "100%": {
              transform: [{ rotate: "360deg" }],
            },
          },
        }}
      />
    </View>
  );
}
