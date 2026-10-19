<template>
  <ContextMenuContent class="w-56">
    <ContextMenuItem as-child>
      <RouterLink :to="playerPath(entry)" target="_blank" rel="noopener">
        <Play class="text-current" />继续播放
      </RouterLink>
    </ContextMenuItem>
    <ContextMenuItem as-child>
      <RouterLink
        :to="{ path: playerPath(entry), query: { restart: '1' } }"
        target="_blank"
        rel="noopener"
      >
        <RotateCcw class="text-current" />本集从头播放
      </RouterLink>
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem
      class="text-destructive"
      @select="history.remove(entry.id)"
    >
      <Trash2 class="text-current" />删除
    </ContextMenuItem>
  </ContextMenuContent>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { Play, RotateCcw, Trash2 } from 'lucide-vue-next';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { playerPath } from '@/lib/movie';
import { useHistoryStore } from '@/stores/history';
import type { HistoryEntry } from '@/types';

// 卡片与侧栏共用同一份历史操作。
defineProps<{ entry: HistoryEntry }>();

// 删除后两处历史列表同步更新。
const history = useHistoryStore();
</script>
