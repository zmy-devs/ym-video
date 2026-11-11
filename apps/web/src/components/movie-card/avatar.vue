<script setup lang="ts">
import MoviePoster from './poster.vue';

defineProps<{ src: string }>();
</script>

<template>
  <MoviePoster :src="src" alt="" class="size-5 shrink-0 rounded-full" />
</template>
