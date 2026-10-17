<template>
  <section
    class="h-9 px-2 flex items-center gap-1.5 rounded-md cursor-pointer transition-colors"
    :class="{ ' bg-hover': active }"
    @click="emits('click')"
    @contextmenu="handleContextmenu"
    @mouseenter="emits('mouseenter')"
  >
    <Icon icon="history" size="18" />

    <span class="mr-auto text-sm text-main ellipsis">
      {{ data.label }}
    </span>

    <Icon icon="enter" size="16" color="#888" v-if="active" />

    <span class="shrink-0 text-xs text-sub" v-else>
      {{ formatDay(data.time) }}
    </span>
  </section>
</template>

<script setup lang="ts">
import { formatDay } from "@/utils/format";
import { SearchHistory } from "@type";
import Icon from "@/components/ui/icon/index.vue";

const props = defineProps<{
  data: SearchHistory;
  active?: boolean;
}>();

const emits = defineEmits<{
  click: [];
  contextmenu: [e: MouseEvent, keyword: string];
  mouseenter: [];
}>();

//处理菜单
const handleContextmenu = (e: MouseEvent) => {
  emits("contextmenu", e, props.data.label);
};
</script>

<style scoped lang="scss"></style>
