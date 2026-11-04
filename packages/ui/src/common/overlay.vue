<template>
  <Teleport :to="fullscreen ?? 'body'" :disabled="!fullscreen">
    <div
      data-slot="overlay"
      v-bind="$attrs"
      :class="
        cn(
          'fixed inset-0 z-55 flex items-center justify-center bg-background',
          props.class,
        )
      "
    >
      <slot />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { shallowRef, type HTMLAttributes } from 'vue';
import { useEventListener } from '@vueuse/core';
import { cn } from '../lib/utils';

// 全屏覆盖层承载加载、断网等阻断界面。
const props = defineProps<{ class?: HTMLAttributes['class'] }>();

// 视频进入浏览器全屏后，覆盖层跟随全屏容器显示。
const fullscreen = shallowRef(document.fullscreenElement);
useEventListener(document, 'fullscreenchange', () => {
  fullscreen.value = document.fullscreenElement;
});

// 覆盖层属性始终传给实际容器。
defineOptions({ inheritAttrs: false });
</script>
