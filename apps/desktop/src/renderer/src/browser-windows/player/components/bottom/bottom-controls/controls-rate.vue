<template>
  <MenuTooltip
    :width="140"
    :data="data"
    trigger="hover"
    placement="top"
    :append-to="playerRef"
    :disabled="rateTip"
  >
    <Buttom>
      <Icon icon="rate" size="24" />
    </Buttom>
  </MenuTooltip>
</template>

<script setup lang="ts">
import { MenuGroup, MenuTooltip } from "@/components/ui/menu";
import Icon from "@/components/ui/icon/index.vue";
import Buttom from "./controls-button.vue";
import { playerRef } from "@player/stores/useEl";
import { useVideoStore } from "@player/stores/useVideoStore";

const { rate, rateTip } = storeToRefs(useVideoStore());
const { setRate } = useVideoStore();

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

const data: MenuGroup[] = [
  {
    label: "倍速",
    children: rateList.map(item => ({
      label: item.label,
      value: item.value,
      active: () => item.value == rate.value,
      sub: () => (item.value == rate.value ? "√" : ""),
      onSelect() {
        setRate(item.value);
      },
    })),
  },
];
</script>

<style scoped lang="scss"></style>
