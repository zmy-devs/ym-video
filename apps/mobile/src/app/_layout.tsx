import "@/global.css";
import Icon from "@/components/icon";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { View, Text } from "react-native";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useNetworkState } from "expo-network";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import Dialog from "@/components/dialog";
import { exitFullscreen } from "@/utils/fullscreen";

export const unstable_settings = {
  anchor: "(tabs)",
};

//取消关闭
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const networkState = useNetworkState();

  useEffect(() => {
    SplashScreen.hideAsync();

    exitFullscreen();
  }, []);

  if (networkState.isInternetReachable === false) {
    return <OffLine />;
  }

  return (
    <GestureHandlerRootView>
      <BottomSheetModalProvider>
        <SafeAreaProvider>
          <SystemBars
            style="light"
            hidden={{
              statusBar: false,
              navigationBar: false,
            }}
          />

          <Stack
            screenOptions={{
              headerShown: false,
              animation: "ios_from_right",
            }}
          >
            <Stack.Screen name="(tabs)" />

            <Stack.Screen name="search" />

            <Stack.Screen name="search-result" />

            <Stack.Screen name="player" />

            <Stack.Screen name="settings/source" />

            <Stack.Screen name="settings/general" />

            <Stack.Screen name="settings/about" />

            <Stack.Screen name="settings/repo" />

            <Stack.Screen name="settings/add-source" />
          </Stack>

          <Dialog />
        </SafeAreaProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

function OffLine() {
  return (
    <View className="flex-1 flex-center bg-bg">
      <View className="items-center">
        <Icon name="offline" size={150} color="rgba(255,255,255,0.3)" />

        <Text className="text-main-dark2 text-xl text-center">
          哎呀，你好像没网了~
        </Text>
      </View>
    </View>
  );
}
