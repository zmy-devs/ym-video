<template>
  <Field class="gap-2" :data-invalid="!!error" :data-disabled="disabled">
    <FieldLabel :for="id" class="h-5 w-full min-w-0 leading-5">
      <Tooltip v-if="error" :label="error">
        <span :id="`${id}-error`" class="truncate text-destructive">{{
          error
        }}</span>
      </Tooltip>
      <template v-else>{{ label }}</template>
    </FieldLabel>
    <slot :control="{ id }" />
    <FieldDescription v-if="description" :id="`${id}-description`">
      {{ description }}
    </FieldDescription>
  </Field>
</template>

<script setup lang="ts">
import { useId } from 'vue';
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@ym-video/ui/components/field';
import Tooltip from '@ym-video/ui/common/tooltip.vue';

// 错误占用原标签位置，输入框位置保持稳定。
const props = defineProps<{
  id?: string;
  label: string;
  description?: string;
  error?: string;
  disabled?: boolean;
}>();

// 由字段管理标签与输入框的关联。
const id = props.id ?? useId();
</script>
