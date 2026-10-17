<template>
  <main
    class="base-card flex flex-col gap-1"
    @contextmenu="e => emits('contextmenu', e)"
    @click="emits('click')"
  >
    <section class="flex relative overflow-hidden rounded-lg aspect-3/4">
      <Image :src="data.pic" class="wh-full" />

      <div class="mask p-1 flex absolute inset-0">
        <span class="text-white text-xs text-shadow">
          {{ data.year }}
        </span>

        <span class="mt-auto ml-auto text-white text-xs text-shadow">
          {{ data.remarks }}
        </span>
      </div>

      <div
        class="h-1 absolute bottom-0 left-0 bg-main rounded-full"
        :style="{
          width: `${progress}%`,
        }"
      ></div>
    </section>

    <section class="w-full px-1 flex flex-col">
      <span class="text-main ellipsis">
        {{ data.name }}
      </span>

      <span className="text-sub text-sm ellipsis">
        {{ sub || data.area + "  " + data.lang }}
      </span>
    </section>
  </main>
</template>

<script setup lang="ts">
import Image from "@/components/image.vue";
import { HistoryInfo, MovieInfo } from "@type";

withDefaults(
  defineProps<{
    data: MovieInfo | HistoryInfo;
    sub?: string;
    progress?: number;
  }>(),
  {
    progress: 0,
  }
);

const emits = defineEmits<{
  click: [];
  contextmenu: [e: MouseEvent];
}>();
</script>

<style scoped lang="scss">
.base-card {
  min-width: 160px;

  .mask {
    background-image: linear-gradient(
      rgba(0, 0, 0, 0.7),
      transparent 20%,
      transparent 80%,
      rgba(0, 0, 0, 0.7)
    );
  }

  &:hover {
    .hover {
      transform: scale(1);
    }
  }
}
</style>
