import MovieList from "@/components/card/movie-list";
import Empty from "@/components/empty";
import { Loading } from "@/components/loading";
import TitleBar, { BackControl } from "@/components/title-bar";
import useLoading from "@/hooks/useLoading";
import { loadData, searchMovieState } from "@/stores/useSeachMovieStore";
import { MovieInfo } from "@/type";
import { FlatList, View, Text } from "react-native";
import { useSnapshot } from "valtio";

export default function () {
  return (
    <View className="flex-1 bg-bg">
      <TitleBar title="搜索结果" leftContent={<BackControl />} />

      <View className="flex-1 px-4">
        <Content />
      </View>
    </View>
  );
}

function Content() {
  const { data, status } = useSnapshot(searchMovieState);

  const handleEnd = useLoading(loadData);

  if (status == "empty") {
    return <Empty />;
  }

  if (status == "loading" && data.length == 0) {
    return <Loading />;
  }

  return (
    <FlatList
      contentContainerClassName="py-4 gap-4"
      data={data}
      keyExtractor={item => item.id}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => <MovieList data={item as MovieInfo} />}
      ListFooterComponent={Footer}
      onEndReached={handleEnd}
    />
  );
}

function Footer() {
  const { status, data } = useSnapshot(searchMovieState);

  if (data.length == 0) {
    return null;
  }

  if (status == "end") {
    return (
      <View className=" py-2 flex-center">
        <Text className="text-main-dark2 text-xl">到底了~</Text>
      </View>
    );
  }

  return <Loading />;
}
