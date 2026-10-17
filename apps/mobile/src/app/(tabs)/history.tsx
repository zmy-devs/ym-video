import HistoryList from "@/components/card/history-list";
import Empty from "@/components/empty";
import BottomSheetMenu, {
  BottomSheetMenuHandle,
} from "@/components/bottom-sheet/bottom-sheet-menu";
import TitleBar from "@/components/title-bar";
import {
  clearHistory,
  historyState,
  removeHistory,
} from "@/stores/useHistoryStore";
import { HistoryInfo } from "@/type";
import { groupByTime } from "@/utils/group";
import { router } from "expo-router";
import { createRef, useMemo } from "react";
import { SectionList, Text, TouchableOpacity, View } from "react-native";
import { useSnapshot } from "valtio";
import Icon from "@/components/icon";
import eventEmitter from "@/hooks/eventEmitter";

const historyMoreRef = createRef<BottomSheetMenuHandle>();

const moreRef = createRef<BottomSheetMenuHandle>();

export default function () {
  const handleMore = () => {
    moreRef.current?.open();
  };

  return (
    <View className="flex-1 bg-bg">
      <TitleBar
        title="历史记录"
        rightContent={
          <TouchableOpacity
            className="flex-1 flex-center aspect-square"
            onPress={handleMore}
          >
            <Icon name="more" size={26} />
          </TouchableOpacity>
        }
      />

      <View className="flex-1 px-4">
        <Content />
      </View>

      <BottomSheetMenu
        title={(data: HistoryInfo) => data.name}
        ref={historyMoreRef}
        data={[
          [
            {
              label: "播放",
              icon: "play",
              value: "play",
              onPress(data: HistoryInfo) {
                historyMoreRef.current?.close();

                eventEmitter.emit("openPlayer", data);

                router.push("/player");
              },
            },
          ],
          [
            {
              label: "删除",
              icon: "remove",
              value: "remove",
              style: {
                color: "#f87171",
              },
              onPress(data: HistoryInfo) {
                historyMoreRef.current?.close();

                removeHistory(data.id);
              },
            },
          ],
        ]}
      />

      <BottomSheetMenu
        title="更多操作"
        ref={moreRef}
        data={[
          [
            {
              label: "删除所有历史记录",
              icon: "remove",
              value: "remove",
              style: {
                color: "#f87171",
              },
              onPress() {
                moreRef.current?.close();

                clearHistory();
              },
            },
          ],
        ]}
      />
    </View>
  );
}

function Content() {
  const { data } = useSnapshot(historyState);

  //按照分类的数据
  const sections = useMemo(() => {
    const res = groupByTime(data, item => item.time);

    return res.filter(item => item.data.length > 0);
  }, [data]);

  //处理播放
  const handlePlay = (data: HistoryInfo) => {
    eventEmitter.emit("openPlayer", data);

    router.push("/player");
  };

  //处理长按菜单
  const handleMenu = (data: HistoryInfo) => {
    historyMoreRef.current?.open(data);
  };

  if (sections.length == 0) {
    return <Empty title="暂无更多历史记录..." />;
  }

  return (
    <SectionList
      contentContainerClassName="py-4 gap-4"
      sections={sections}
      keyExtractor={item => String(item.id)}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => handlePlay(item)}
          onLongPress={() => handleMenu(item)}
          delayLongPress={200}
        >
          <HistoryList data={item as HistoryInfo} />
        </TouchableOpacity>
      )}
      renderSectionHeader={({ section }) => (
        <Text className="text-main text-lg font-bold">{section.title}</Text>
      )}
    />
  );
}
