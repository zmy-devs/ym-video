<template>
  <Item label="检查更新" icon="update" sub="检查是否有版本更新">
    <Button
      type="primary"
      @click="checkUpdate"
      v-if="status == 'init' || status == 'downloaded'"
    >
      检查更新
    </Button>

    <span class="px-2 text-main text-sm" v-else>
      {{ tip }}
    </span>
  </Item>
</template>

<script setup lang="ts">
import Item from "@manager/views/setting/setting-item.vue";
import Button from "@/components/ui/button.vue";
import { useUpdateStore } from "@manager/stores/useUpdateStore";

const { status, downloadProgress } = storeToRefs(useUpdateStore());
const { checkUpdate } = useUpdateStore();

const map = {
  checking: () => "正在检查更新...",
  "update-available": () => "发现更新",
  "update-not-available": () => "已是最新版",
  downloading: () => `下载中: ${downloadProgress.value}%`,
};

const tip = computed(() => {
  const fn = map[status.value];

  return fn();
});
</script>

<style scoped lang="scss"></style>
