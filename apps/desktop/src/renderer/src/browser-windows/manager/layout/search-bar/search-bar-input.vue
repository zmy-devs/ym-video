<template>
  <form class="h-12 px-3 flex items-center gap-2" @keydown.enter="handleSubmit">
    <Icon icon="search" size="26" color="rgba(255,255,255,0.3)" />

    <input
      type="text"
      class="flex-1 text-main placeholder:text-sub"
      placeholder="搜索影视资源..."
      v-model="keyword"
      required
      v-focus
    />

    <button @click="handleClear" v-if="keyword.length > 0" type="button">
      <Icon icon="close" size="22" color="rgba(255,255,255,0.3)" />
    </button>
  </form>
</template>

<script setup lang="ts">
import { vFocus } from "@manager/hooks/useFoucs";
import Icon from "@/components/ui/icon/index.vue";

const emits = defineEmits<{
  search: [keyword: string];
}>();

//关键词
const keyword = ref("");

//清空关键词
const handleClear = () => {
  keyword.value = "";
};

//处理提交搜索
const handleSubmit = (e: KeyboardEvent) => {
  if (!keyword.value) {
    return;
  }

  e.stopPropagation();

  emits("search", keyword.value);

  handleClear();
};
</script>

<style scoped lang="scss"></style>
