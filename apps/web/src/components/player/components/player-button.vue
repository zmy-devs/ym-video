<template>
  <Tooltip :label="label" side="top" :container="container">
    <button
      type="button"
      :ref="forwardRef"
      :data-control="label"
      v-bind="$attrs"
      class="size-9 flex shrink-0 items-center justify-center rounded-full bg-[var(--player-control)] text-white/80 shadow-[var(--player-shadow)] transition-colors hover:enabled:bg-[#808080] focus-visible:outline-white disabled:cursor-default disabled:opacity-40 [&_svg]:size-5 [&_svg]:shrink-0"
      :disabled="disabled"
      @click="emit('click', $event)"
    >
      <slot />
    </button>
  </Tooltip>
</template>

<script setup lang="ts">
import { useForwardExpose } from 'reka-ui';
import Tooltip from '@ym-video/ui/common/tooltip.vue';

// 外层触发器的属性和焦点引用传给真实按钮。
defineOptions({ inheritAttrs: false });

// 将菜单触发器的焦点引用传给真实按钮。
const { forwardRef } = useForwardExpose();

// 播放控制统一使用 36px 圆形按钮与 20px 图标，全屏提示挂在播放器内部。
defineProps<{
  label: string;
  container: HTMLElement | null;
  disabled?: boolean;
}>();

// 保留原始点击事件，让倍速菜单触发器能读取鼠标与默认处理状态。
const emit = defineEmits<{ click: [event: MouseEvent] }>();
</script>
