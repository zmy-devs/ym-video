<template>
  <Select :model-value="model" @update:model-value="handleValue">
    <SelectTrigger
      :id="id"
      aria-label="主题色"
      :show-icon="!mobile"
      class="shrink-0"
      :class="
        mobile
          ? 'gap-2 border-0 bg-transparent p-0 shadow-none data-[size=default]:h-11 dark:bg-transparent dark:hover:bg-transparent'
          : desktopWidth
      "
    >
      <SelectValue>
        <span
          v-if="!mobile"
          class="size-4 shrink-0 rounded-full border"
          :style="{ background: themeColors[model].color }"
        />
        <span :class="mobile && 'text-muted-foreground'">{{
          themeColors[model].label
        }}</span>
      </SelectValue>
      <ChevronsUpDown v-if="mobile" class="size-5 text-muted-foreground" />
    </SelectTrigger>
    <SelectContent align="end" class="w-48">
      <SelectItem
        v-for="(option, value) in themeColors"
        :key="value"
        :value="value"
      >
        <span
          class="size-4 shrink-0 rounded-full border"
          :style="{ background: option.color }"
        />
        <span>{{ option.label }}</span>
      </SelectItem>
    </SelectContent>
  </Select>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChevronsUpDown } from 'lucide-vue-next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ym-video/ui/components/select';
import {
  themeColors,
  isThemeColor,
  type ThemeColor,
} from '@ym-video/ui/composables/use-theme';

// 主题色选项、色板和弹出内容在两端复用。
const props = defineProps<{
  id?: string;
  mobile?: boolean;
  compact?: boolean;
}>();

// 调用方负责保存当前选择的主题色。
const model = defineModel<ThemeColor>({ required: true });

// 桌面入口按使用位置选择控件宽度。
const desktopWidth = computed(() => (props.compact ? 'w-32' : 'w-40'));

// 只提交共享色板中已定义的主题色。
const handleValue = (value: unknown) => {
  if (isThemeColor(value)) {
    model.value = value;
  }
};
</script>
