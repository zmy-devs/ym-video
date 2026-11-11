<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui';
import type { ButtonHTMLAttributes, HTMLAttributes } from 'vue';
import type { ButtonVariants } from '.';
import { cn } from '@ym-video/ui/lib/utils';
import { Primitive } from 'reka-ui';
import { ref } from 'vue';
import { buttonVariants } from '.';

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant'];
  size?: ButtonVariants['size'];
  class?: HTMLAttributes['class'];
  type?: ButtonHTMLAttributes['type'];
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  type: 'button',
});

// 暴露底层元素焦点能力，供弹层关闭后恢复键盘焦点。
type ButtonElement = HTMLElement | { $el: HTMLElement };

const buttonElement = ref<ButtonElement | null>(null);
const focus = () => {
  const element = buttonElement.value;

  if (element instanceof HTMLElement) {
    element.focus();
    return;
  }

  element?.$el.focus();
};

defineExpose({ focus });
</script>

<template>
  <Primitive
    ref="buttonElement"
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    :type="as === 'button' && !asChild ? type : undefined"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
