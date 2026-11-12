<template>
  <div class="mx-auto grid w-full max-w-4xl gap-6 p-4">
    <SettingsGroup v-if="isMobile" title="外观" mobile>
      <ButtonGroupItem as="div">
        <span>基础主题</span>
        <ThemeModeSelect v-model="theme.mode" mobile />
      </ButtonGroupItem>
      <ButtonGroupItem as="div">
        <span>主题色</span>
        <ThemeColorSelect v-model="theme.color" mobile />
      </ButtonGroupItem>
    </SettingsGroup>
    <section
      v-else
      class="grid gap-2 overflow-hidden rounded-2xl border border-border bg-card p-4"
    >
      <h2 class="text-sm font-medium">外观</h2>
      <AppearanceSettings
        compact
        v-model:mode="theme.mode"
        v-model:color="theme.color"
      />
    </section>

    <AccountSettings
      v-model:pending="pending"
      :client="authClient"
      :mobile="isMobile"
    />

    <UpdateSettings v-if="isMobile" mobile />
    <section
      v-else
      class="grid gap-2 overflow-hidden rounded-2xl border border-border bg-card p-4"
    >
      <UpdateSettings />
    </section>

    <SettingsGroup v-if="isMobile" title="关于" mobile>
      <ButtonGroupItem as-child>
        <a
          href="https://github.com/zmy-devs/ym-video/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>反馈问题</span>
          <ChevronRight class="size-5 stroke-muted-foreground" />
        </a>
      </ButtonGroupItem>
      <ButtonGroupItem as="div">
        <span>版本</span>
        <span class="text-muted-foreground">{{ version }}</span>
      </ButtonGroupItem>
    </SettingsGroup>
    <section
      v-else
      class="grid gap-2 overflow-hidden rounded-2xl border border-border bg-card p-4"
    >
      <AboutSettings />
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getVersion } from '@tauri-apps/api/app';
import { isTauri } from '@tauri-apps/api/core';
import { ChevronRight } from 'lucide-vue-next';
import ButtonGroupItem from '@ym-video/ui/common/button-group-item.vue';
import AccountSettings from '@ym-video/ui/account/settings.vue';
import AppearanceSettings from '@ym-video/ui/common/appearance-settings.vue';
import SettingsGroup from '@ym-video/ui/common/settings-group.vue';
import ThemeModeSelect from '@ym-video/ui/common/theme-mode-select.vue';
import ThemeColorSelect from '@ym-video/ui/common/theme-color-select.vue';
import { authClient } from '@/services/auth';
import { isMobile } from '@/platform';
import { useThemeStore } from '@/stores/theme-store';
import AboutSettings from '@/components/dialogs/settings/about-settings.vue';
import UpdateSettings from '@/components/dialogs/settings/update-settings.vue';

// 外观设置复用当前设备的持久化主题状态。
const theme = useThemeStore();

// 账号表单共用同一提交状态。
const pending = ref<'username' | 'password' | null>(null);

// 版本信息读取自当前安装包，浏览器预览单独标明运行环境。
const version = ref(isTauri() ? '正在读取版本…' : '浏览器预览');

onMounted(() => {
  if (!isMobile || !isTauri()) {
    return;
  }

  getVersion()
    .then((current) => {
      version.value = current;
    })
    .catch(() => {
      version.value = '读取失败';
    });
});
</script>
