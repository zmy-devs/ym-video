<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { PanelLeft, PanelLeftClose } from 'lucide-vue-next';
import { cn } from '@ym-video/ui/lib/utils';
import { Button } from '@ym-video/ui/components/button';
import { useSidebar } from './utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();

const { open, toggleSidebar } = useSidebar();
</script>

<template>
  <Button
    data-sidebar="trigger"
    data-slot="sidebar-trigger"
    variant="ghost"
    size="icon"
    :class="cn('h-7 w-7', props.class)"
    @click="toggleSidebar"
  >
    <PanelLeftClose v-if="open" />
    <PanelLeft v-else />
  </Button>
</template>
