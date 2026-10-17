import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";

export default function (history: number, count: number, max: number = 50) {
  const itemWidth = 5 + String(count).length * 20;

  const [page, setPage] = useState(Math.floor(history / max));

  const pageCount = Math.ceil(count / max);

  const pad = (num: string | number) => {
    return String(num).padStart(String(count).length, "0");
  };

  const pageList = Array.from({ length: pageCount }, (_, i) => {
    const start = i * max + 1;
    const end = Math.min((i + 1) * max, count);

    return { label: `${pad(start)}-${pad(end)}`, value: i };
  });

  return {
    pageList,
    page,
    itemWidth,
    setPage,
    EpisodeItem,
  };
}

type EpisodeItemProps = {
  active?: boolean;
  label?: string;
  onPress?: () => void;
};

function EpisodeItem({ active, label, onPress }: EpisodeItemProps) {
  return (
    <TouchableOpacity className="items-center" onPress={onPress}>
      <Text className={`text-xl ${active ? "text-main" : "text-main-dark2"}`}>
        {label}
      </Text>

      <View
        className={`w-1/2 h-0.5  rounded-full ${active ? "bg-main" : "transparent"}`}
      />
    </TouchableOpacity>
  );
}
