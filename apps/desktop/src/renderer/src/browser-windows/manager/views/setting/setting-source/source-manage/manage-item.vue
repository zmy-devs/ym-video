<template>
  <section
    class="pl-3 pr-2 py-1.5 flex items-center gap-2 rounded-md hover:bg-hover transition-colors cursor-pointer"
    :class="`${disabled && 'bg-hover'}`"
    @click.self="emits('click')"
  >
    <div class="mr-auto flex flex-col overflow-hidden">
      <span class="shrink-0 text-main text-sm ellipsis">
        {{ label }}
      </span>

      <span class="text-sub text-xs ellipsis">
        {{ sub }}
      </span>
    </div>

    <Tooltip
      :disabled="disabled"
      label="删除"
      placement="right"
      v-if="!disabled"
    >
      <button
        :disabled="disabled"
        class="size-7 flex-center rounded hover:bg-hover"
        @click="emits('remove')"
      >
        <Icon icon="dismiss" size="18" />
      </button>
    </Tooltip>
  </section>
</template>

<script setup lang="ts">
import { Icon } from "@/components/ui/icon";
import Tooltip from "@/components/ui/tooltip.vue";

defineProps<{
  label: string;
  sub: string;
  disabled?: boolean;
}>();

const emits = defineEmits<{
  remove: [];
  click: [];
}>();
</script>

<style scoped lang="scss"></style>
