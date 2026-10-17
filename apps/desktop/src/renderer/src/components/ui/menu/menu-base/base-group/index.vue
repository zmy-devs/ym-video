<template>
  <section class="menu-group p-1 flex flex-col" v-if="!data.hidden">
    <div class="h-8 px-3 flex items-center" v-if="data.label">
      <span class="text-xs text-sub">{{ data.label }}</span>
    </div>

    <Item v-for="(item, index) of children" :key="index" :data="item" />
  </section>
</template>

<script setup lang="ts">
import Item from "./group-item.vue";
import { MenuGroup } from "../../type";
import { getValue } from "@/utils/value";

const props = defineProps<{
  data: MenuGroup;
}>();

//自定义数据
const customData = inject<Ref<any>>("customData")!;

const children = computed(() => {
  return getValue(props.data.children, customData.value);
});
</script>

<style scoped lang="scss">
.menu-group {
  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.094);
  }
}
</style>
