import { Group, GroupItem } from "@/components/setting-group";
import TitleBar, { BackControl } from "@/components/title-bar";
import { View, ScrollView } from "react-native";
import { openURL } from "expo-linking";
import { appVersion } from "@/services/info";
import { useSnapshot } from "valtio";
import { configState } from "@/stores/useConfigStore";

export default function () {
  return (
    <View className=" flex-1 bg-bg">
      <TitleBar title="关于" leftContent={<BackControl />} />

      <ScrollView
        contentContainerClassName="p-4 gap-4"
        showsVerticalScrollIndicator={false}
      >
        <Group data={[<VersionOption />]} />

        <Group
          data={[<UpdateContentOption />, <AddressOption />, <IssueOption />]}
        />
      </ScrollView>
    </View>
  );
}

function VersionOption() {
  return <GroupItem label="当前版本" sub={appVersion} />;
}

function AddressOption() {
  const { selectedRepo } = useSnapshot(configState);

  const handlePress = () => {
    openURL(selectedRepo.url);
  };

  return (
    <GroupItem
      label="项目地址"
      icon="globe"
      onPress={handlePress}
      rightVisible={true}
    />
  );
}

function IssueOption() {
  const { selectedRepo } = useSnapshot(configState);

  const handlePress = () => {
    openURL(`${selectedRepo.url}/issues`);
  };

  return (
    <GroupItem
      label="反馈问题"
      icon="bug"
      onPress={handlePress}
      rightVisible={true}
    />
  );
}

function UpdateContentOption() {
  const { selectedRepo } = useSnapshot(configState);

  const handlePress = () => {
    openURL(`${selectedRepo.url}/blob/main/release-note.md`);
  };

  return (
    <GroupItem
      label="更新内容"
      icon="update"
      onPress={handlePress}
      rightVisible={true}
    />
  );
}
