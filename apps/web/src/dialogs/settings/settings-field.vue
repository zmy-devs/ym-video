<template>
  <div class="min-h-17.5 flex items-center gap-2.5 px-4 py-3 text-sm">
    <div class="min-w-0 flex-1 space-y-1">
      <label :for="id" class="font-medium">{{ label }}</label>
      <p
        v-if="description"
        :id="`${id}-description`"
        class="text-muted-foreground"
      >
        {{ description }}
      </p>
      <p v-if="error" :id="`${id}-error`" role="alert" class="text-destructive">
        {{ error }}
      </p>
    </div>
    <slot
      :control="{
        id,
        'aria-label': label,
        'aria-invalid': !!error,
        'aria-describedby': error ? `${id}-error` : descriptionId,
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// 设置项沿用参考项目的左侧说明、右侧控件排布。
const props = defineProps<{
  id: string;
  label: string;
  description?: string;
  error?: string;
}>();

// 提示与输入框建立关联，错误反馈优先被读出。
const descriptionId = computed(() =>
  props.description ? `${props.id}-description` : undefined,
);
</script>
