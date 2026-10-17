<template>
  <section class="flex">
    <img src="@/assets/images/default.png" class="flex-1" v-if="loading" />

    <img
      :src="currentSrc"
      class="flex-1"
      @load="handleLoad"
      @error="retryLoad"
      v-show="!loading"
    />
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  src: string;
}>();

//当前加载的src
const currentSrc = ref("");

//是否加载
const loading = ref(true);

//重试次数
let retryCount = 1;

//加载成功
const handleLoad = () => {
  loading.value = false;
};

//重试
const retryLoad = () => {
  if (!props.src || retryCount == 5) {
    return;
  }

  retryCount++;

  setTimeout(() => {
    currentSrc.value = props.src + "?t=" + Date.now();
  }, 1000);
};

watchEffect(() => {
  currentSrc.value = props.src;
});
</script>

<style scoped lang="scss"></style>
