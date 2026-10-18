<template>
  <Tooltip :delay-duration="300" disable-hoverable-content>
    <TooltipTrigger as-child>
      <button
        :ref="forwardRef"
        v-bind="$attrs"
        type="button"
        class="player-button size-9 flex shrink-0 items-center justify-center rounded-full text-white/80 transition-colors focus-visible:outline-white disabled:cursor-default disabled:opacity-40 [&_svg]:size-5 [&_svg]:shrink-0"
        :aria-label="label"
        :disabled="disabled"
        @click="emit('click', $event)"
      >
        <slot />
      </button>
    </TooltipTrigger>
    <TooltipContent
      :portal-container="container"
      :show-arrow="false"
      side="top"
    >
      {{ label }}
    </TooltipContent>
  </Tooltip>
</template>

<script setup lang="ts">
import { useForwardExpose } from 'reka-ui';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

<style scoped>
.player-button {
  background-color: var(--player-control);
  box-shadow: var(--player-shadow);
}

.player-button:hover:not(:disabled) {
  background-color: #808080;
}
</style>
