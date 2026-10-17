import {
  Text,
  TouchableOpacity,
  Pressable,
  View,
  GestureResponderEvent,
} from "react-native";
import { useSnapshot } from "valtio";
import { FlatList } from "react-native-gesture-handler";
import { useEffect, useRef, useState } from "react";
import eventEmitter from "@/hooks/eventEmitter";
import { historyState } from "@player/stores/useHistoryStore";
import { Episode } from "@/type";
import useEpisode from "@/hooks/useEpisode";

const COUNT = 30;

export default function () {
  const [visible, setVisible] = useState(false);

  const handleClose = (e: GestureResponderEvent) => {
    if (e.target != e.currentTarget) return;

    setVisible(false);
  };

  useEffect(() => {
    const { remove } = eventEmitter.on("player:list:show", () => {
      setVisible(true);
    });

    return () => {
      remove();
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Pressable
      className="items-center absolute inset-0 z-40"
      style={{
        backgroundColor: "rgba(0,0,0,0.8)",
      }}
      onPress={handleClose}
    >
      <List />
    </Pressable>
  );
}

function List() {
  const { data } = useSnapshot(historyState);

  const episodeRef = useRef<FlatList>(null);

  const { pageList, itemWidth, page, setPage, EpisodeItem } = useEpisode(
    data.history,
    data.episodes.length,
    COUNT
  );

  const handleLayout = () => {
    episodeRef.current?.scrollToIndex({
      index: page,
      animated: false,
    });
  };

  return (
    <View className="w-1/2 h-full pt-6 gap-2">
      <FlatList
        className="shrink-0  grow-0"
        contentContainerStyle={{
          gap: 16,
        }}
        ref={episodeRef}
        data={pageList}
        keyExtractor={item => String(item.value)}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <EpisodeItem
            active={item.value == page}
            label={item.label}
            onPress={() => setPage(item.value)}
          />
        )}
        getItemLayout={(_, index) => ({
          length: itemWidth,
          offset: itemWidth * index + 16 * (index - 1),
          index,
        })}
        onLayout={handleLayout}
      />

      <FlatList
        numColumns={3}
        contentContainerClassName="py-2 gap-1.5"
        columnWrapperClassName="gap-1.5"
        showsVerticalScrollIndicator={false}
        data={data.episodes.slice(page * COUNT, page * COUNT + COUNT)}
        keyExtractor={item => String(item.value)}
        renderItem={({ item }) => <Item data={item} />}
      />
    </View>
  );
}

type ItemProps = {
  data: Episode;
};

function Item({ data }: ItemProps) {
  const { data: history } = useSnapshot(historyState);

  const handlePress = () => {
    historyState.data.history = data.value;
  };

  return (
    <TouchableOpacity
      className="flex-1 h-12 py-2 flex-center rounded-lg"
      style={{
        backgroundColor:
          history.history == data.value
            ? "rgba(255,255,255,0.81)"
            : "rgba(255,255,255,0.2)",
      }}
      onPress={handlePress}
    >
      <Text
        className={`text-lg ${history.history == data.value ? "text-333" : "text-main"}`}
      >
        {data.label}
      </Text>
    </TouchableOpacity>
  );
}
