import TitleBar, { BackControl } from "@/components/title-bar";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  ToastAndroid,
} from "react-native";
import Input from "@/components/input/input";
import { useState } from "react";
import { getCategory } from "@/services/api";
import { LoadingGlobal } from "@/components/loading";
import { router } from "expo-router";
import Icon from "@/components/icon";
import { proxy, useSnapshot } from "valtio";
import { addSource, configState } from "@/stores/useConfigStore";

const form = proxy({
  label: {
    value: "",
    validate: true,
    message: "标题不能为空或重复",
    validator() {
      this.validate =
        this.value.length != 0 &&
        !configState.sources.some(item => item.label == this.value);

      return this.validate;
    },
  },
  url: {
    value: "",
    validate: true,
    message: "不是有效的url地址",
    validator() {
      this.validate = /^https?:\/\/.+/.test(this.value);

      return this.validate;
    },
  },
});

export default function () {
  const { label, url } = useSnapshot(form);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    let res = true;

    for (const key of Object.keys(form)) {
      const item = form[key as keyof typeof form];

      const validate = item.validator();

      if (validate) {
        continue;
      }

      res = false;
    }

    if (!res) {
      return;
    }

    try {
      setLoading(true);

      const res = await getCategory(form.url.value);

      if (res.category.size == 0) {
        ToastAndroid.show(`无法解析${form.url.value}`, ToastAndroid.LONG);
        return;
      }

      addSource({
        label: form.label.value,
        url: form.url.value,
      });

      ToastAndroid.show(`添加成功`, ToastAndroid.LONG);

      router.back();
    } catch {
      ToastAndroid.show(`无法解析${form.url.value}`, ToastAndroid.LONG);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <LoadingGlobal mask />}

      <View className=" flex-1 bg-bg">
        <TitleBar title="添加播放源" leftContent={<BackControl />} />

        <ScrollView
          contentContainerClassName="p-4 flex-1 gap-5"
          showsVerticalScrollIndicator={false}
        >
          <View className="h-20 flex flex-col">
            <Text className="mb-2 text-main">播放源标题</Text>

            <Input
              placeholder="请输入添加的名称"
              beforeIcon={
                <Icon name="tag" color="rgba(255,255,255,0.3)" size={22} />
              }
              submitToClear={false}
              onChange={val => (form.label.value = val)}
              onSubmit={handleSubmit}
              className={`${!label.validate && "border border-red-400"}`}
            />

            {!label.validate && (
              <Text className="text-red-400 text-sm">{label.message}</Text>
            )}
          </View>

          <View className="h-20 flex flex-col">
            <Text className="mb-2 text-main">播放源地址</Text>

            <Input
              placeholder="请输入播放源地址"
              beforeIcon="link"
              submitToClear={false}
              onChange={val => (form.url.value = val)}
              onSubmit={handleSubmit}
              className={`${!url.validate && "border border-red-400"}`}
            />

            {!url.validate && (
              <Text className="text-red-400 text-sm">{url.message}</Text>
            )}
          </View>

          <View className="mt-auto pb-2 items-center">
            <TouchableOpacity
              className="w-1/2 h-12 flex-center rounded-full bg-primary"
              style={{
                boxShadow: [
                  {
                    offsetX: 0,
                    offsetY: 4,
                    color: "rgba(0,0,0,0.4)",
                    blurRadius: 10,
                  },
                ],
              }}
              onPress={handleSubmit}
            >
              <Text className="text-white font-medium">添加</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
