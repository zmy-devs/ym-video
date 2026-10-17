import {
  historyDerivedState,
  historyState,
  setHistory,
} from "@player/stores/useHistoryStore";
import { PropsWithChildren, useMemo } from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { useSnapshot } from "valtio";
import Icon from "@/components/icon";
import eventEmitter from "@/hooks/eventEmitter";
import { formatRemarks } from "@/utils/format";

export default function () {
  const { data } = useSnapshot(historyState);
  const { selectedEpisode } = useSnapshot(historyDerivedState);

  const episodeLabel = useMemo(() => {
    return formatRemarks(selectedEpisode?.label || "");
  }, [selectedEpisode]);

  return (
    <View className="w-full flex-row justify-between items-center">
      <Text
        className="text-main text-2xl"
        style={{
          textShadowColor: "rgba(0,0,0)",
          textShadowRadius: 2,
        }}
      >
        {data.name} · {episodeLabel}
      </Text>

      <RightControls />
    </View>
  );
}

type ButtonProps = {
  onPress?: () => void;
};

function Button({ children, onPress }: PropsWithChildren<ButtonProps>) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className=" w-10 h-10 flex-center rounded-full"
      style={{
        backgroundColor: "rgba(100,100,100,0.8)",
        boxShadow: [
          {
            offsetX: 0,
            offsetY: 1,
            blurRadius: 5,
            spreadDistance: 0,
            color: "rgba(0,0,0,0.5)",
          },
        ],
      }}
    >
      {children}
    </TouchableOpacity>
  );
}

//底部右边控件
function RightControls() {
  const { data } = useSnapshot(historyState);

  const visiblePre = useMemo(() => {
    return data.history != 0;
  }, [data.history, data.episodes]);

  const visibleNext = useMemo(() => {
    return data.history != data.episodes.length - 1;
  }, [data.history, data.episodes]);

  //处理上一集
  const handlePre = () => {
    setHistory(history => history - 1);
  };

  //处理下一集
  const handleNext = () => {
    setHistory(history => history + 1);
  };

  const handleRate = () => {
    eventEmitter.emit("player:rate:show");
  };

  const handleList = () => {
    eventEmitter.emit("player:list:show");
  };

  return (
    <View className="flex-row gap-4">
      {visiblePre && (
        <Button onPress={handlePre}>
          <Icon name="next" size={22} className=" rotate-180" />
        </Button>
      )}

      {visibleNext && (
        <Button onPress={handleNext}>
          <Icon name="next" size={22} />
        </Button>
      )}

      <Button onPress={handleRate}>
        <Icon name="rate" size={25} />
      </Button>

      {data.episodes.length > 1 && (
        <Button onPress={handleList}>
          <Icon name="list" size={25} />
        </Button>
      )}
    </View>
  );
}
