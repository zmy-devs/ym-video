<template>
  <ScrollArea class="h-full">
    <div class="page-content">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold">观看历史</h1>
          <p class="mt-2 text-sm text-muted-foreground">
            仅保存在本浏览器 · {{ history.sorted.length }} 部影片
          </p>
        </div>
        <AlertDialog
          ><AlertDialogTrigger as-child
            ><Button variant="outline" :disabled="!history.sorted.length"
              ><Trash2 class="size-4" />清空历史</Button
            ></AlertDialogTrigger
          ><AlertDialogContent
            ><AlertDialogHeader
              ><AlertDialogTitle>清空观看历史？</AlertDialogTitle
              ><AlertDialogDescription
                >这会删除本浏览器中的全部观看记录和播放进度，无法恢复。</AlertDialogDescription
              ></AlertDialogHeader
            ><AlertDialogFooter
              ><AlertDialogCancel>取消</AlertDialogCancel
              ><AlertDialogAction @click="history.clear"
                >确认清空</AlertDialogAction
              ></AlertDialogFooter
            ></AlertDialogContent
          ></AlertDialog
        >
      </div>
      <MovieGridSkeleton v-if="!history.loaded" />
      <div v-else-if="!history.sorted.length" class="empty-state">
        <History class="size-10" />
        <h2 class="text-base text-foreground">还没有观看记录</h2>
        <p>开始播放后，会在这里记住你的进度</p>
        <Button as-child variant="outline"
          ><RouterLink to="/overview">去找一部影片</RouterLink></Button
        >
      </div>
      <div v-else class="movie-grid">
        <MovieCard
          v-for="entry in history.sorted"
          :key="entry.id"
          :movie="entry"
          :entry="entry"
        />
      </div>
    </div>
  </ScrollArea>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { History, Trash2 } from 'lucide-vue-next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import MovieCard from '@/components/movie-card.vue';
import MovieGridSkeleton from '@/components/movie-grid-skeleton.vue';
import { useHistoryStore } from '@/stores/history';

// 历史页始终读取同一浏览器的记录，不随账号切换而归属到用户。
const history = useHistoryStore();
</script>
