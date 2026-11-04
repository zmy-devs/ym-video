<template>
  <SidebarGroup>
    <SidebarGroupLabel v-if="title" class="px-0">
      <button
        v-if="collapsible"
        class="group/section h-8 w-full flex items-center justify-between rounded-md px-2 text-left outline-hidden transition-colors hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        @click="open = !open"
      >
        <span>{{ title }}</span>
        <ChevronDown
          class="size-4 shrink-0 opacity-0 transition-[opacity,transform] group-hover/section:opacity-100 group-focus-visible/section:opacity-100"
          :class="{ '-rotate-90': !open }"
        />
      </button>
      <span v-else class="px-2">{{ title }}</span>
    </SidebarGroupLabel>
    <SidebarMenu :id="id" v-show="!collapsible || open">
      <slot />
    </SidebarMenu>
  </SidebarGroup>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
} from '../../components/sidebar';

// 侧栏分组统一处理标题和折叠交互。
defineProps<{ id?: string; title?: string; collapsible?: boolean }>();

// 分组默认展开，切换页面时保留当前状态。
const open = ref(true);
</script>
