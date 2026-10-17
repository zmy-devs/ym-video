import {
  Text,
  TouchableOpacity,
  Pressable,
  GestureResponderEvent,
} from "react-native";
import { useSnapshot } from "valtio";
import { FlatList } from "react-native-gesture-handler";
import { useEffect, useState } from "react";
import eventEmitter from "@/hooks/eventEmitter";
import { setRate, videoStore } from "../stores/useVideoStore";

const rateList = [
  {
    label: "4.0x",
    value: 4,
  },
  {
    label: "3.0x",
    value: 3,
  },
  {
    label: "2.0x",
    value: 2,
  },
  {
    label: "1.0x",
    value: 1,
  },
  {
    label: "0.75x",
    value: 0.75,
  },
  {
    label: "0.5x",
    value: 0.5,
  },
  {
    label: "0.25x",
    value: 0.25,
  },
];

export default function () {
  const [visible, setVisible] = useState(false);

  const handleClose = (e: GestureResponderEvent) => {
    if (e.target != e.currentTarget) return;

    setVisible(false);
  };

  useEffect(() => {
    const { remove } = eventEmitter.on("player:rate:show", () => {
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
      <FlatList
        className="w-1/4 h-full pt-6"
        contentContainerClassName="py-2 gap-2"
        showsVerticalScrollIndicator={false}
        data={rateList}
        keyExtractor={item => String(item.value)}
        renderItem={({ item }) => <Item data={item} />}
      />
    </Pressable>
  );
}

type ItemProps = {
  data: {
    label: string;
    value: number;
  };
};

function Item({ data }: ItemProps) {
  const { rate } = useSnapshot(videoStore);

  return (
    <TouchableOpacity
      className="w-full py-2 flex-center rounded-xl"
      style={{
        backgroundColor:
          rate == data.value
            ? "rgba(255,255,255,0.81)"
            : "rgba(255,255,255,0.2)",
      }}
      onPress={() => setRate(data.value)}
    >
      <Text
        className={`text-xl ${rate == data.value ? "text-333" : "text-main"}`}
      >
        {data.label}
      </Text>
    </TouchableOpacity>
  );
}
