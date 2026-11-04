<template>
  <Overlay data-slot="loading-overlay">
    <Spinner class="size-6" />
  </Overlay>
</template>

<script setup lang="ts">
import { Spinner } from '../components/spinner';
import Overlay from './overlay.vue';
</script>
