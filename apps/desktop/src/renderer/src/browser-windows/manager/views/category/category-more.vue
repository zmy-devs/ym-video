<template>
  <footer class="py-2 flex-center" v-if="movies.length">
    <span className="text-sub" v-if="status == 'end'"> 到底了~ </span>

    <Loading v-else />
  </footer>
</template>

<script setup lang="ts">
import Loading from "@/components/ui/loading/index.vue";
import { useMovieStore } from "@manager/stores/useMovieStore";

const { status, movies } = storeToRefs(useMovieStore());
</script>

<style scoped lang="scss"></style>
