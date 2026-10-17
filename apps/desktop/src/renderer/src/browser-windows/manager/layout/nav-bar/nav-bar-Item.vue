<template>
  <Tooltip
    :disabled="!tipLabel"
    :label="tipLabel"
    :sub="tipSub"
    placement="right"
  >
    <section
      class="h-8 px-2 flex items-center gap-2 shrink-0 rounded-md cursor-pointer hover:bg-hover transition-colors"
      :class="{ active: isActive }"
      @click="handleClick"
      @contextmenu="handleContextmenu"
    >
      <slot name="icon">
        <Icon :icon="icon" size="22" v-if="icon" />
      </slot>

      <span class="text-main text-sm ellipsis">{{ label }}</span>
    </section>
  </Tooltip>
</template>

<script setup lang="ts">
import { IconName } from "@/components/ui/icon";
import Icon from "@/components/ui/icon/index.vue";
import Tooltip from "@/components/ui/tooltip.vue";

const router = useRouter();
const route = useRoute();

const props = defineProps<{
  label: string;
  tipLabel?: string;
  tipSub?: string;
  icon?: IconName;
  to?: string;
  active?: boolean;
}>();

const emits = defineEmits<{
  click: [];
  contextmenu: [e: MouseEvent];
}>();

//是否激活
const isActive = computed(() => {
  return route.path == props.to || props.active;
});

//处理点击
const handleClick = () => {
  props.to && router.push(props.to);

  emits("click");
};

//处理菜单
const handleContextmenu = (e: MouseEvent) => {
  emits("contextmenu", e);
};
</script>

<style scoped lang="scss">
.active {
  background-color: var(--hover-color);
}
</style>
