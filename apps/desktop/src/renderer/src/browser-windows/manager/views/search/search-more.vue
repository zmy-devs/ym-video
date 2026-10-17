<template>
  <footer class="py-2 flex-center" v-if="searchMovies.length">
    <span className="text-sub" v-if="status == 'end'"> 到底了~ </span>

    <Loading v-else />
  </footer>
</template>

<script setup lang="ts">
import Loading from "@/components/ui/loading/index.vue";
import { useSearchMovieStore } from "@manager/stores/useSearchMovieStore";

const { searchMovies, status } = storeToRefs(useSearchMovieStore());
</script>

<style scoped lang="scss"></style>
