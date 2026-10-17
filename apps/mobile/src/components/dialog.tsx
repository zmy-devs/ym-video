import { withResolvers } from "@/utils/promise";
import { useEffect } from "react";
import { View, Text, TouchableOpacity, BackHandler } from "react-native";
import { proxy, useSnapshot } from "valtio";

const state = proxy({
  title: "",
  content: "",
  confirmButtonText: "",
  cancelButtonText: "",
  visible: false,

  confirm: () => {},
  cancel: () => {},
});

interface ConfirmOption {
  title: string;
  content: string;

  confirmButtonText?: string;
  cancelButtonText?: string;
}

export const confirm = (option: ConfirmOption) => {
  const { promise, resolve } = withResolvers<boolean>();

  Object.assign(state, {
    ...option,
    visible: true,
    confirm: () => {
      state.visible = false;
      resolve(true);
    },
    cancel: () => {
      state.visible = false;
      resolve(false);
    },
  });

  return promise;
};

export default function () {
  const {
    title,
    content,
    visible,
    confirmButtonText,
    cancelButtonText,
    cancel,
    confirm,
  } = useSnapshot(state);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (state.visible) {
          state.cancel();
          return true;
        }

        return false;
      }
    );

    return () => subscription.remove();
  }, []);

  if (!visible) {
    return;
  }

  return (
    <View
      className="flex-center absolute inset-0 z-999 "
      style={{
        backgroundColor: "rgba(0,0,0,0.4)",
      }}
    >
      <View
        className=" bg-bg rounded-2xl"
        style={{
          width: 250,
          boxShadow: [
            {
              offsetX: 0,
              offsetY: 1,
              color: "rgba(0,0,0,0.5)",
              blurRadius: 10,
            },
          ],
        }}
      >
        <View className="p-4 gap-4">
          <Text className="text-main text-center  text-lg">{title}</Text>

          <Text className="text-main text-center">{content}</Text>
        </View>

        <View className="w-full h-12 flex-row border-t border-border">
          <TouchableOpacity
            className="flex-1 flex-center border-r border-border"
            onPress={confirm}
          >
            <Text className="text-primary">{confirmButtonText || "确定"}</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-1 flex-center" onPress={cancel}>
            <Text className="text-sub">{cancelButtonText || "取消"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
