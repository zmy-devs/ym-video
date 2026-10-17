import TabBar from "@/components/tab-bar";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { useSnapshot } from "valtio";
import * as movieStore from "@/stores/useMovieStore";
import * as latestStore from "@/stores/useLatestMovieStore";
import Icon from "@/components/icon";
import { configState } from "@/stores/useConfigStore";

export default function TabLayout() {
  const { selectedSource } = useSnapshot(configState);

  useEffect(() => {
    movieStore.init();
    latestStore.init();
  }, [selectedSource]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={props => <TabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "首页",
          tabBarIcon: ({ focused }) => (
            <Icon
              name="home"
              size={30}
              color={
                focused ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)"
              }
            />
          ),
        }}
      />

      <Tabs.Screen
        name="category"
        options={{
          title: "分类",
          tabBarIcon: ({ focused }) => (
            <Icon
              name="category"
              size={30}
              color={
                focused ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)"
              }
            />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "历史",
          tabBarIcon: ({ focused }) => (
            <Icon
              name="history"
              size={30}
              color={
                focused ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)"
              }
            />
          ),
        }}
      />

      <Tabs.Screen
        name="setting"
        options={{
          title: "设置",
          tabBarIcon: ({ focused }) => (
            <Icon
              name="setting"
              size={30}
              color={
                focused ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)"
              }
            />
          ),
        }}
      />
    </Tabs>
  );
}
