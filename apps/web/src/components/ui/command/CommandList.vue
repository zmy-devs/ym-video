<script setup lang="ts">
import type { ListboxContentProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { reactiveOmit } from '@vueuse/core';
import { cn } from '@/lib/utils';
import { ListboxContent, useForwardProps } from 'reka-ui';
import { ScrollArea } from '@/components/ui/scroll-area';

const props = defineProps<
  ListboxContentProps & { class?: HTMLAttributes['class'] }
>();

const delegatedProps = reactiveOmit(props, 'class');

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <ListboxContent
    data-slot="command-list"
    v-bind="forwarded"
    :class="cn('overflow-hidden', props.class)"
  >
    <ScrollArea
      type="auto"
      class="max-h-[300px] [&_[data-slot=scroll-area-viewport]]:max-h-[300px]"
    >
      <div role="presentation" class="scroll-py-1">
        <slot />
      </div>
    </ScrollArea>
  </ListboxContent>
</template>
