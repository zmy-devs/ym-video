import Icon from "@/components/icon";
import TitleBar from "@/components/title-bar";
import {
  addSearchHistory,
  clearSearchHistory,
  removeSearchHistory,
  searchHistoryState,
  updateTime,
} from "@/stores/useSearchHistoryStore";
import { KeywordHistory } from "@/type";
import { formatDay } from "@/utils/format";
import { createRef, useMemo } from "react";
import { FlatList, TouchableOpacity, View, Text, Keyboard } from "react-native";
import { useSnapshot } from "valtio";
import { BottomSheetHandle } from "@/components/bottom-sheet";
import BottomSheetMenu, {
  BottomSheetMenuHandle,
} from "@/components/bottom-sheet/bottom-sheet-menu";
import { router, useFocusEffect } from "expo-router";
import { searchData } from "@/stores/useSeachMovieStore";
import Empty from "@/components/empty";
import SearchBar, { SearchBarHandle } from "@/components/search-bar";

const moreRef = createRef<BottomSheetMenuHandle>();

const bottomSheetRef = createRef<BottomSheetHandle>();

const searchBarRef = createRef<SearchBarHandle>();

//搜索
const search = (keyword: string) => {
  searchData(keyword);

  updateTime(keyword);

  router.push("/search-result");
};

export default function () {
  const handleMore = () => {
    Keyboard.dismiss();

    bottomSheetRef.current?.open();
  };

  const handleSubmit = (keyword: string) => {
    addSearchHistory(keyword);

    searchData(keyword);

    router.push("/search-result");
  };

  //进入页面打开键盘
  useFocusEffect(() => {
    const timer = setTimeout(() => {
      searchBarRef.current?.focus();
    }, 50);

    return () => clearTimeout(timer);
  });

  return (
    <View className="flex-1 bg-bg">
      <TitleBar
        boxShadow={false}
        content={
          <View className="px-4 py-1 flex-1 flex-row gap-2">
            <SearchBar onSubmit={handleSubmit} ref={searchBarRef} />

            <TouchableOpacity
              className="h-full aspect-square flex-center bg-222 rounded-xl"
              onPress={handleMore}
            >
              <Icon name="more" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        }
      />

      <View className="flex-1 px-4">
        <Content />
      </View>

      <BottomSheetMenu
        ref={moreRef}
        title={(keyword: string) => keyword}
        data={[
          [
            {
              label: `搜索`,
              icon: "search",
              value: "search",
              onPress(keyword: string) {
                moreRef.current?.close();

                search(keyword);
              },
            },
          ],
          [
            {
              label: `删除`,
              icon: "remove",
              value: "remove",
              style: {
                color: "#f87171",
              },
              onPress(keyword: string) {
                moreRef.current?.close();

                removeSearchHistory(keyword);
              },
            },
          ],
        ]}
      />

      <BottomSheetMenu
        ref={bottomSheetRef}
        title="更多操作"
        data={[
          [
            {
              label: `删除所有历史`,
              icon: "remove",
              value: "remove",
              style: {
                color: "#f87171",
              },
              onPress() {
                bottomSheetRef.current?.close();

                clearSearchHistory();
              },
            },
          ],
        ]}
      />
    </View>
  );
}

function Content() {
  const { data } = useSnapshot(searchHistoryState);

  const sortData = useMemo(() => {
    return Array.from(data.values()).sort((a, b) => b.time - a.time);
  }, [data]);

  const handleMore = (keyword: string) => {
    moreRef.current?.open(keyword);
  };

  if (sortData.length == 0) {
    return <Empty />;
  }

  return (
    <FlatList
      contentContainerClassName="py-2 gap-4"
      data={sortData}
      showsVerticalScrollIndicator={false}
      keyExtractor={item => String(item.time)}
      renderItem={({ item }) => {
        return (
          <TouchableOpacity
            className="px-1"
            onPress={() => search(item.label)}
            onLongPress={() => handleMore(item.label)}
            delayLongPress={200}
          >
            <Item data={item} />
          </TouchableOpacity>
        );
      }}
    />
  );
}

type ItemProps = {
  data: KeywordHistory;
};

function Item({ data }: ItemProps) {
  return (
    <View className="flex-row justify-between items-center gap-2">
      <View className="flex-1">
        <Text className="text-main-dark1 text-lg" numberOfLines={1}>
          {data.label}
        </Text>

        <Text className="text-main-dark2 text-sm">{formatDay(data.time)}</Text>
      </View>

      <Icon name="enter" size={20} color="rgba(255,255,255,0.6)" />
    </View>
  );
}
