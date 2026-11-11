<template>
  <EmptyBase :class="props.class">
    <EmptyHeader>
      <EmptyMedia v-if="icon" variant="icon" class="bg-accent">
        <component :is="icon" />
      </EmptyMedia>
      <EmptyTitle>{{ label }}</EmptyTitle>
      <EmptyDescription v-if="description">
        {{ description }}
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent v-if="action">
      <Button variant="outline" @click="emit('action')">
        {{ action }}
      </Button>
    </EmptyContent>
  </EmptyBase>
</template>

<script setup lang="ts">
import type { Component, HTMLAttributes } from 'vue';
import { Button } from '@ym-video/ui/components/button';
import {
  Empty as EmptyBase,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ym-video/ui/components/empty';

// Empty 统一承载图标、文案和单个恢复操作。
const props = defineProps<{
  label: string;
  description?: string;
  action?: string;
  icon?: Component;
  class?: HTMLAttributes['class'];
}>();

const emit = defineEmits<{ action: [] }>();
</script>
