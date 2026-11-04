<template>
  <section class="flex flex-col gap-8">
    <div>
      <h2 class="border-b px-4 py-3 text-sm">界面</h2>
      <SettingsField
        id="settings-theme-mode"
        v-slot="{ control }"
        label="基础主题"
        description="设置 Ym Video 的基础主题"
      >
        <Select :model-value="mode" @update:model-value="handleMode">
          <SelectTrigger v-bind="control" class="w-40 shrink-0">
            <SelectValue>
              <component :is="selectedMode.icon" class="size-4" />
              <span>{{ selectedMode.label }}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
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
      </SettingsField>
      <SettingsField
        id="settings-theme-color"
        v-slot="{ control }"
        label="主题色"
        description="设置界面控件的强调色"
      >
        <Select :model-value="color" @update:model-value="handleColor">
          <SelectTrigger v-bind="control" class="w-40 shrink-0">
            <SelectValue>
              <span
                class="size-4 shrink-0 rounded-full border"
                :style="{ background: themeColors[color].color }"
              />
              <span>{{ themeColors[color].label }}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
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
      </SettingsField>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Monitor, Moon, Sun } from 'lucide-vue-next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ym-video/ui/components/select';
import {
  themeColors,
  isThemeMode,
  isThemeColor,
  type ThemeMode,
  type ThemeColor,
} from '@ym-video/ui/composables/use-theme';
import SettingsField from './settings-field.vue';

// 直接使用已有主题状态和持久化能力，选择后即时生效。
const mode = defineModel<ThemeMode>('mode', { required: true });
const color = defineModel<ThemeColor>('color', { required: true });

// 选择器只提交定义过的主题值。
const handleMode = (value: unknown) => {
  if (isThemeMode(value)) {
    mode.value = value;
  }
};
const handleColor = (value: unknown) => {
  if (isThemeColor(value)) {
    color.value = value;
  }
};

// 基础主题沿用原设置菜单的选项。
const modes = [
  { value: 'auto', label: '跟随系统', icon: Monitor },
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
];

// 下拉框选中态与参考项目一样展示主题图标和名称。
const selectedMode = computed(
  () => modes.find((option) => option.value === mode.value) ?? modes[0],
);
</script>
