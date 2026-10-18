<template>
  <div role="status" class="movie-grid">
    <span class="sr-only">正在加载影片</span>
    <div v-for="i in 12" :key="i" class="grid gap-2">
      <Skeleton class="aspect-[3/4] rounded-lg" />
      <Skeleton class="mt-1 h-4 w-3/4" />
      <Skeleton class="h-3 w-1/2" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton';
</script>
