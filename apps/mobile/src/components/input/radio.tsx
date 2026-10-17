import { View } from "react-native";

export type RadioProps = {
  active?: boolean;
  height: number;
};

export default function ({ active, height }: RadioProps) {
  return (
    <View
      className={`flex-center aspect-square rounded-full border-main-dark2 ${active ? "bg-primary" : "border"}`}
      style={{
        height,
      }}
    >
      <View
        className={`aspect-square rounded-full ${active && "bg-white"}`}
        style={{
          height: height / 2,
        }}
      />
    </View>
  );
}
