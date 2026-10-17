import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { bottom } = useSafeAreaInsets();

  return (
    <View
      className="w-screen flex-row justify-evenly items-center bg-bg"
      style={{
        height: 56 + bottom,
        paddingBottom: bottom,
        boxShadow: [
          {
            offsetX: 0,
            offsetY: 0,
            blurRadius: 5,
            spreadDistance: 5,
            color: "rgba(0,0,0,0.1)",
          },
        ],
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={index}
            className="h-full flex-center aspect-square"
            onPress={onPress}
          >
            <Text
              className={`text-lg font-medium ${isFocused ? "text-main" : "text-main/50"}`}
            >
              {options.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
