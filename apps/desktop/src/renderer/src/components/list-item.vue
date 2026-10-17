<template>
  <button
    class="w-fit px-2 flex flex-col items-center shrink-0 cursor-pointer"
    @click="e => emits('click', e)"
  >
    <span class="text-base text-sub hover:text-main" :class="{ active }">
      {{ label }}
    </span>

    <div class="w-1/2 rounded-full" :class="`${active && 'bg-primary'}`"></div>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  active?: boolean;
}>();

const emits = defineEmits<{
  click: [e: PointerEvent];
}>();
</script>

<style scoped lang="scss">
button {
  > div {
    height: 2px;
  }
}

.active {
  color: var(--main-color);
}
</style>
