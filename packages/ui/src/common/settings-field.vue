<template>
  <div
    data-slot="settings-field"
    :data-invalid="!!error"
    class="min-h-17.5 flex items-center gap-2.5 px-4 py-3 text-sm"
  >
    <div class="min-w-0 flex-1 space-y-1">
      <label :for="id" class="font-medium">{{ label }}</label>
      <p
        v-if="description"
        :id="`${id}-description`"
        class="text-muted-foreground"
      >
        {{ description }}
      </p>
      <p v-if="error" :id="`${id}-error`" class="text-destructive">
        {{ error }}
      </p>
    </div>
    <slot :control="{ id }" />
  </div>
</template>

<script setup lang="ts">
// 设置项沿用参考项目的左侧说明、右侧控件排布。
defineProps<{
  id: string;
  label: string;
  description?: string;
  error?: string;
}>();
</script>
