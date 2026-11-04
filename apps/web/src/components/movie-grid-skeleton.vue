<template>
  <div
    data-slot="movie-grid-skeleton"
    class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-5 gap-y-7"
  >
    <div v-for="i in 12" :key="i" class="grid gap-2">
      <Skeleton class="aspect-3/4 rounded-lg" />
      <Skeleton class="mt-1 h-4 w-3/4" />
      <Skeleton class="h-3 w-1/2" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Skeleton } from '@ym-video/ui/components/skeleton';
</script>
