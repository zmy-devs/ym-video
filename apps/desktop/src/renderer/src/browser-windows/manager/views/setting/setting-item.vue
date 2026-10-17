<template>
  <section
    class="h-16 p-2 pr-3 flex items-center gap-2 rounded-md bg-list border border-border"
  >
    <div class="w-10 flex-center aspect-square">
      <Icon :icon="icon" size="26" color="rgba(255,255,255,0.6)" />
    </div>

    <div class="mr-auto flex flex-col">
      <span class="text-main text-sm">{{ label }}</span>
      <span class="text-sub text-xs" v-if="sub">{{ sub }}</span>
    </div>

    <div class="flex items-center gap-2">
      <slot></slot>
    </div>
  </section>
</template>

<script setup lang="ts">
import Icon from "@/components/ui/icon/index.vue";
import { IconName } from "@/components/ui/icon";

defineProps<{
  label: string;
  sub?: string;
  icon: IconName;
}>();
</script>

<style scoped lang="scss"></style>
