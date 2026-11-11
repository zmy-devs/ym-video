<template>
  <section class="flex flex-col gap-8">
    <div>
      <SettingsField
        id="settings-theme-mode"
        v-slot="{ control }"
        label="基础主题"
        :description="compact ? '明暗模式' : '设置 Ym Video 的基础主题'"
      >
        <ThemeModeSelect v-bind="control" v-model="mode" :compact="compact" />
      </SettingsField>
      <SettingsField
        id="settings-theme-color"
        v-slot="{ control }"
        label="主题色"
        :description="compact ? '强调色' : '设置界面控件的强调色'"
      >
        <ThemeColorSelect v-bind="control" v-model="color" :compact="compact" />
      </SettingsField>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ThemeMode, ThemeColor } from '@ym-video/ui/composables/use-theme';
import SettingsField from './settings-field.vue';
import ThemeModeSelect from './theme-mode-select.vue';
import ThemeColorSelect from './theme-color-select.vue';

// 外观设置与移动端复用同一套主题选择组件。
const mode = defineModel<ThemeMode>('mode', { required: true });

// 主题色由应用的持久化状态维护。
const color = defineModel<ThemeColor>('color', { required: true });

// 紧凑布局仅调整桌面触发控件宽度。
defineProps<{ compact?: boolean }>();
</script>
