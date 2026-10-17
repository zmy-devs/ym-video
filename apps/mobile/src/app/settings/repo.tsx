import Radio from "@/components/input/radio";
import { Group, GroupItem } from "@/components/setting-group";
import TitleBar, { BackControl } from "@/components/title-bar";
import { View, ScrollView } from "react-native";
import { useSnapshot } from "valtio";
import { configState, setRepo } from "@/stores/useConfigStore";
import { Repo } from "@/type";

export const repos = [
  {
    label: "Gitee",
    url: "https://gitee.com/yxingyus/ym-video-app",
    updateUrl:
      "https://gitee.com/api/v5/repos/yxingyus/ym-video-app/releases/latest",
  },
  {
    label: "GitHub",
    url: "https://github.com/2514765066/ym-video-app",
    updateUrl:
      "https://api.github.com/repos/2514765066/ym-video-app/releases/latest",
  },
];

export default function () {
  return (
    <View className="flex-1 bg-bg">
      <TitleBar title="远程数据源" leftContent={<BackControl />} />

      <ScrollView
        contentContainerClassName="p-4"
        showsVerticalScrollIndicator={false}
      >
        <Group data={repos} renderItem={({ item }) => <Item {...item} />} />
      </ScrollView>
    </View>
  );
}

function Item(props: Repo) {
  const { selectedRepo } = useSnapshot(configState);

  return (
    <GroupItem
      label={props.label}
      sub={<Radio height={18} active={props.url == selectedRepo.url} />}
      onPress={() => setRepo(props)}
    />
  );
}
