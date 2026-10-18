<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            :disabled="!library.sources.length"
            aria-label="切换播放源"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <img :src="appIcon" alt="" class="size-8 shrink-0 rounded-lg" />
            <span class="min-w-0 flex-1 grid text-left text-sm leading-tight">
              <span class="truncate font-semibold">Ym Video</span>
              <span class="truncate text-[13px] text-muted-foreground">{{
                library.source?.name || '选择播放源'
              }}</span>
            </span>
            <ChevronsUpDown class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-60">
          <DropdownMenuItem
            v-for="source in library.sources"
            :key="source.id"
            :aria-current="source.id === library.selected ? true : undefined"
            @select="handleSource(source.id)"
          >
            <Server class="text-current" />
            <span>{{ source.name }}</span>
            <Check
              v-if="source.id === library.selected"
              class="ml-auto text-current"
            />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <Plus class="text-current" />
            <span>添加播放源</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { Check, ChevronsUpDown, Plus, Server } from 'lucide-vue-next';
import appIcon from '@/assets/icon.png';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLibraryStore } from '@/stores/library';

// 当前页面用于判断是否需要重置分类。
const route = useRoute();

// 切换播放源时清除旧源的分类路由。
const router = useRouter();

// 服务端允许的播放源及当前选择。
const library = useLibraryStore();

// 选源后分类返回全部，避免沿用其他源的分类 ID。
const handleSource = async (id: unknown) => {
  if (typeof id !== 'string' || id === library.selected) {
    return;
  }
  if (route.path.startsWith('/category')) {
    await router.push('/category');
  }
  await library.select(id);
};
</script>
