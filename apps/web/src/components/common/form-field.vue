<template>
  <Field class="gap-2" :data-invalid="!!error" :data-disabled="disabled">
    <FieldLabel
      :for="id"
      class="h-5 w-full min-w-0 leading-5"
      :title="error || label"
    >
      <span
        v-if="error"
        :id="`${id}-error`"
        role="alert"
        class="truncate text-destructive"
        >{{ error }}</span
      >
      <template v-else>{{ label }}</template>
    </FieldLabel>
    <slot
      :control="{
        id,
        'aria-label': label,
        'aria-invalid': !!error,
        'aria-describedby': describedBy,
      }"
    />
    <FieldDescription v-if="description" :id="`${id}-description`">
      {{ description }}
    </FieldDescription>
  </Field>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';

// 错误占用原标签位置，输入框位置和可访问名称保持稳定。
const props = defineProps<{
  id: string;
  label: string;
  description?: string;
  error?: string;
  disabled?: boolean;
}>();

// 输入框同时关联填写规则和校验错误。
const describedBy = computed(() => {
  const ids = [];
  if (props.description) {
    ids.push(`${props.id}-description`);
  }
  if (props.error) {
    ids.push(`${props.id}-error`);
  }
  return ids.join(' ') || undefined;
});
</script>
