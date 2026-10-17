import { BottomSheetView } from "@gorhom/bottom-sheet";
import BottomSheet, {
  BottomSheetHandle,
} from "@/components/bottom-sheet/index";
import { View, Text, TouchableOpacity } from "react-native";
import Icon, { IconName } from "@/components/icon";
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

type Props = {
  title?: string | ((value: any) => string);
  data: {
    icon?: IconName;
    label: string;
    value: string | number;
    onPress?: (value: any) => void;

    style?: {
      color?: string;
    };
  }[][];
};

export type BottomSheetMenuHandle = {
  open: (customData?: any) => void;
  close: () => void;
};

export default forwardRef<BottomSheetMenuHandle, Props>(
  ({ title, data }, ref) => {
    const [customData, setCustomData] = useState<any>({});
    const bottomSheetRef = useRef<BottomSheetHandle>(null);

    const titleComputed = useMemo(() => {
      return typeof title == "function" ? title(customData) : title;
    }, [title, customData]);

    useImperativeHandle(ref, () => ({
      open: value => {
        if (value) {
          setCustomData(value);
        }

        bottomSheetRef.current?.open();
      },
      close: () => {
        bottomSheetRef.current?.close();
      },
    }));

    return (
      <BottomSheet ref={bottomSheetRef}>
        <BottomSheetView className="px-4 pb-4 pt-2 flex-1 items-center gap-4 ">
          {titleComputed && (
            <Text className="text-main text-center text-lg font-bold">
              {titleComputed}
            </Text>
          )}

          {data.map((group, index) => {
            return (
              <View
                key={index}
                className="w-full rounded-xl overflow-hidden border border-main-dark3"
                style={{
                  backgroundColor: "#252525",
                }}
              >
                {group.map((item, index) => {
                  return (
                    <TouchableOpacity
                      key={item.value}
                      className={`w-full p-4 flex-row items-center gap-4  border-main-dark3 ${group.length - 1 != index && "border-b"}`}
                      onPress={() => item.onPress && item.onPress(customData)}
                    >
                      {item.icon && (
                        <Icon
                          name={item.icon}
                          size={25}
                          color={item.style?.color || "#888"}
                        />
                      )}

                      <Text
                        numberOfLines={1}
                        className="flex-1 text-lg"
                        style={{
                          color: item.style?.color || "rgba(255,255,255,0.8)",
                        }}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
