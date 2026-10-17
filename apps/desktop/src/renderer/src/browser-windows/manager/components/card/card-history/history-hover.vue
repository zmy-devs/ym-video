<template>
  <BaseHover :data="data">
    <span class="text-sm text-sub">
      {{ sub }}
    </span>

    <div class="flex items-center">
      <Icon class="mr-1" icon="source" color="#888" size="20" />

      <span class="mr-3 text-sm text-sub">{{ data.source.label }}</span>

      <span class="text-sm text-sub">{{ formatDay(data.time) }}</span>
    </div>
  </BaseHover>
</template>

<script setup lang="ts">
import BaseHover from "../base-hover.vue";
import { Icon } from "@/components/ui/icon";
import { formatDay } from "@/utils/format";
import { HistoryInfo } from "@type";

defineProps<{
  data: HistoryInfo;
  sub?: string;
}>();
</script>

<style scoped lang="scss">
.card-hover {
  width: 280px;

  box-shadow: rgba(0, 0, 0, 0.2) 0px 14px 28px -6px,
    rgba(0, 0, 0, 0.12) 0px 2px 4px -1px;

  transform: scale(0);

  transition: transform 0.15s;

  > section {
    box-shadow: 0 0 8px 8px var(--list-color);
  }
}
</style>
