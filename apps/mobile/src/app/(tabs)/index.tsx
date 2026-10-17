import HistoryCard from "@/components/card/history-card";
import MovieList from "@/components/card/movie-list";
import Icon from "@/components/icon";
import { Loading } from "@/components/loading";
import TitleBar from "@/components/title-bar";
import { historyState } from "@/stores/useHistoryStore";
import { latestMovieState } from "@/stores/useLatestMovieStore";
import { MovieInfo } from "@/type";
import { getTimePeriod } from "@/utils/time";
import { router } from "expo-router";
import { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSnapshot } from "valtio";

const Height = 50;

export default function () {
  const scrollY = useSharedValue(0);

  const animatedTextStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, Height],
      [1.5, 1],
      Extrapolation.CLAMP
    );

    const translateX = -((1 - scale) * 110) / 2;
    const translateY = -((1 - scale) * Height * 1.5);

    return {
      transform: [{ translateX }, { translateY }, { scale }],
    };
  });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const toSearch = () => {
    router.push("/search");
  };

  return (
    <View className="flex-1 bg-bg">
      <TitleBar
        boxShadow={false}
        content={
          <View className="pl-4 flex-1 flex-row items-center">
            <Animated.Text
              className="text-main font-bold text-xl"
              style={animatedTextStyle}
            >
              Hi，{getTimePeriod()}好 😊
            </Animated.Text>

            <TouchableOpacity
              className="h-full ml-auto flex-center aspect-square"
              onPress={toSearch}
            >
              <Icon name="search" size={26} />
            </TouchableOpacity>
          </View>
        }
      />

      <Animated.ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: Height,
        }}
        contentContainerClassName="min-h-screen gap-8"
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
      >
        <HistoryContent />

        <LastContent />
      </Animated.ScrollView>
    </View>
  );
}

function HistoryContent() {
  const { data } = useSnapshot(historyState);

  const renderData = useMemo(() => {
    return Array.from(data.values())
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);
  }, [data]);

  if (data.size == 0) {
    return null;
  }

  return (
    <View className="gap-4">
      <Text className="px-4 text-main text-lg font-bold">最近观看</Text>

      <FlatList
        contentContainerClassName="px-4 gap-3"
        data={renderData}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          return <HistoryCard data={item} />;
        }}
      />
    </View>
  );
}

function LastContent() {
  const { data } = useSnapshot(latestMovieState);

  if (data.length == 0) {
    return <Loading />;
  }

  return (
    <View className="px-4 gap-4">
      <Text className="text-main text-lg font-bold">最近更新</Text>

      <FlatList
        contentContainerClassName="pb-4 gap-4"
        data={data}
        keyExtractor={(item, index) => item.name + index}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <MovieList data={item as MovieInfo} />}
        scrollEnabled={false}
        ListFooterComponent={LastContentFooter}
      />
    </View>
  );
}

function LastContentFooter() {
  const toCategory = () => {
    router.push("/category");
  };

  return (
    <View className="flex-row flex-center">
      <TouchableOpacity
        className="px-4 py-2 bg-222 rounded-xl"
        onPress={toCategory}
      >
        <Text className="text-main">查看更多</Text>
      </TouchableOpacity>
    </View>
  );
}
