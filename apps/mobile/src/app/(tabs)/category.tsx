import MovieList from "@/components/card/movie-list";
import Icon from "@/components/icon";
import { Loading, LoadingGlobal } from "@/components/loading";
import TitleBar from "@/components/title-bar";
import useLoading from "@/hooks/useLoading";
import {
  loadData,
  movieState,
  setCategory,
  setChildCategory,
} from "@/stores/useMovieStore";
import { MovieInfo } from "@/type";
import { router } from "expo-router";
import { useMemo } from "react";
import { FlatList, TouchableOpacity, View, Text } from "react-native";
import { useSnapshot } from "valtio";

export default function () {
  const toSearch = () => {
    router.push("/search");
  };

  return (
    <View className="flex-1 bg-bg">
      <TitleBar
        title="分类"
        rightContent={
          <TouchableOpacity
            className="flex-1 flex-center aspect-square"
            onPress={toSearch}
          >
            <Icon name="search" size={26} />
          </TouchableOpacity>
        }
      />

      <View className="flex-1">
        <Content />
      </View>
    </View>
  );
}

function Header() {
  const {
    selectedChildCategoryID,
    selectedCategoryID,
    category,
    childCategory,
  } = useSnapshot(movieState);

  //大分类数据
  const categoryData = useMemo(() => {
    return Array.from(category.values());
  }, [category]);

  //子分类数据
  const childCategoryData = useMemo(() => {
    const child = childCategory.get(selectedCategoryID);

    if (!child) return [];

    return Array.from(child.values());
  }, [childCategory, selectedCategoryID]);

  return (
    <View className="gap-4">
      <FlatList
        contentContainerClassName="px-2"
        horizontal
        data={categoryData}
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setCategory(item.id)}>
            <CategoryItem
              label={item.label}
              active={item.id == selectedCategoryID}
            />
          </TouchableOpacity>
        )}
      />

      {childCategoryData.length > 0 && (
        <FlatList
          contentContainerClassName="px-2"
          horizontal
          data={childCategoryData}
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setChildCategory(item.id)}>
              <CategoryItem
                label={item.label}
                active={item.id == selectedChildCategoryID}
              />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function Content() {
  const { data } = useSnapshot(movieState);

  const handleEnd = useLoading(loadData);

  return (
    <FlatList
      contentContainerClassName="py-4 gap-4"
      data={data}
      keyExtractor={(item, index) => item.id + index}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <View className="px-4">
          <MovieList data={item as MovieInfo} />
        </View>
      )}
      ListHeaderComponent={Header}
      ListFooterComponent={Footer}
      ListEmptyComponent={LoadingGlobal}
      onEndReached={handleEnd}
      initialNumToRender={4}
      maxToRenderPerBatch={4}
      updateCellsBatchingPeriod={100}
      windowSize={4}
    />
  );
}

type ItemProps = {
  active?: boolean;
  label: string;
};

function CategoryItem({ active, label }: ItemProps) {
  return (
    <View className="px-2 items-center">
      <Text className={`text-lg ${active ? "text-main" : "text-sub"}`}>
        {label}
      </Text>

      <View
        className={`w-1/2 rounded-full ${active && "bg-main"}`}
        style={{
          height: 2,
        }}
      />
    </View>
  );
}

function Footer() {
  const { status, data } = useSnapshot(movieState);

  if (data.length == 0) {
    return null;
  }

  if (status == "end") {
    return (
      <View className="py-2 flex-center">
        <Text className="text-main-dark2 text-xl">到底了~</Text>
      </View>
    );
  }

  return <Loading />;
}
