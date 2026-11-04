<script setup lang="ts">
import type { PaginationListItemProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import type { ButtonVariants } from '@ym-video/ui/components/button';
import { reactiveOmit } from '@vueuse/core';
import { cn } from '@ym-video/ui/lib/utils';
import { PaginationListItem } from 'reka-ui';
import { buttonVariants } from '@ym-video/ui/components/button';

const props = withDefaults(
  defineProps<
    PaginationListItemProps & {
      size?: ButtonVariants['size'];
      class?: HTMLAttributes['class'];
      isActive?: boolean;
    }
  >(),
  {
    size: 'icon',
  },
);

const delegatedProps = reactiveOmit(props, 'class', 'size', 'isActive');
</script>

<template>
  <PaginationListItem
    data-slot="pagination-item"
    v-bind="delegatedProps"
    :class="
      cn(
        buttonVariants({
          variant: isActive ? 'outline' : 'ghost',
          size,
        }),
        props.class,
      )
    "
  >
    <slot />
  </PaginationListItem>
</template>
