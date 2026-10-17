<template>
  <section class="flex">
    <Tooltip label="返回">
      <button
        class="w-8 flex-center rounded-md aspect-square hover:bg-hover disabled:opacity-40 disabled:pointer-events-none"
        :disabled="!canGoBack"
        @click="back"
      >
        <Icon icon="arrow" size="20" />
      </button>
    </Tooltip>

    <Tooltip label="前进">
      <button
        class="w-8 flex-center rounded-md aspect-square hover:bg-hover disabled:opacity-40 disabled:pointer-events-none"
        :disabled="!canGoForward"
        @click="forward"
      >
        <Icon icon="arrow" size="20" class="rotate-180" />
      </button>
    </Tooltip>
  </section>
</template>

<script setup lang="ts">
import Icon from "@/components/ui/icon/index.vue";
import Tooltip from "@/components/ui/tooltip.vue";

const router = useRouter();

const canGoBack = ref(false);

const canGoForward = ref(false);

router.afterEach(() => {
  canGoBack.value = history.length > 1 && history.state.position != 0;

  canGoForward.value =
    history.state && history.state.position < history.length - 1;
});

const back = () => {
  router.back();
};

const forward = () => {
  router.forward();
};
</script>

<style scoped lang="scss"></style>
