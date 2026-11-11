<template>
  <Select :model-value="model" @update:model-value="handleValue">
    <SelectTrigger
      :id="id"
      aria-label="基础主题"
      :show-icon="!mobile"
      class="shrink-0"
      :class="
        mobile
          ? 'gap-2 border-0 bg-transparent p-0 shadow-none data-[size=default]:h-11 dark:bg-transparent dark:hover:bg-transparent'
          : desktopWidth
      "
    >
      <SelectValue>
        <component v-if="!mobile" :is="selected.icon" class="size-4" />
        <span :class="mobile && 'text-muted-foreground'">{{
          selected.label
        }}</span>
      </SelectValue>
      <ChevronsUpDown v-if="mobile" class="size-5 text-muted-foreground" />
    </SelectTrigger>
    <SelectContent align="end" class="w-48">
      <SelectItem
        v-for="option in modes"
        :key="option.value"
        :value="option.value"
      >
        <component :is="option.icon" class="size-4" />
        <span>{{ option.label }}</span>
      </SelectItem>
    </SelectContent>
  </Select>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChevronsUpDown, Monitor, Moon, Sun } from 'lucide-vue-next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ym-video/ui/components/select';
import {
  isThemeMode,
  type ThemeMode,
} from '@ym-video/ui/composables/use-theme';

// 两端共用主题选项和弹出内容，移动端入口显示紧凑文字。
const props = defineProps<{
  id?: string;
  mobile?: boolean;
  compact?: boolean;
}>();

// 主题偏好由调用方持有并持久化。
const model = defineModel<ThemeMode>({ required: true });

// 基础主题与界面图标使用相同映射。
const modes = [
  { value: 'auto', label: '跟随系统', icon: Monitor },
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
];

// 当前合法主题对应的显示内容。
const selected = computed(
  () => modes.find((option) => option.value === model.value) ?? modes[0],
);

// 桌面入口按使用位置选择控件宽度。
const desktopWidth = computed(() => (props.compact ? 'w-32' : 'w-40'));

// 外部选择值在组件边界收窄。
const handleValue = (value: unknown) => {
  if (isThemeMode(value)) {
    model.value = value;
  }
};
</script>
