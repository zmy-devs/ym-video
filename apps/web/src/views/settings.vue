<template>
  <div class="mx-auto grid w-full max-w-4xl gap-6 p-4">
    <SettingsGroup v-if="isMobile" title="外观" mobile>
      <Button
        as="div"
        variant="outline"
        class="h-auto min-h-16 w-full justify-between gap-4 rounded-2xl !bg-white px-4 py-2 text-base font-normal shadow-none dark:!bg-card"
      >
        <span>基础主题</span>
        <ThemeModeSelect v-model="theme.mode" mobile />
      </Button>
      <Button
        as="div"
        variant="outline"
        class="h-auto min-h-16 w-full justify-between gap-4 rounded-2xl !bg-white px-4 py-2 text-base font-normal shadow-none dark:!bg-card"
      >
        <span>主题色</span>
        <ThemeColorSelect v-model="theme.color" mobile />
      </Button>
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

    <SettingsGroup v-if="isMobile" title="更新" mobile>
      <Button
        as="div"
        variant="outline"
        class="h-auto min-h-16 w-full justify-between gap-4 rounded-2xl !bg-white px-4 py-2 text-base font-normal shadow-none dark:!bg-card"
      >
        <span id="settings-mobile-auto-update">自动更新</span>
        <SwitchRoot
          :model-value="false"
          disabled
          aria-labelledby="settings-mobile-auto-update"
          class="h-5 w-9 shrink-0 rounded-full border border-transparent bg-input opacity-50"
        >
          <SwitchThumb
            class="size-4 block translate-x-0.5 rounded-full bg-background shadow-sm"
          />
        </SwitchRoot>
      </Button>
      <Button
        variant="outline"
        disabled
        class="h-auto min-h-16 w-full justify-between rounded-2xl !bg-white px-4 py-4 text-base font-normal shadow-none dark:!bg-card"
      >
        <span>更新内容</span>
        <ChevronRight class="size-5 text-muted-foreground" />
      </Button>
      <Button
        variant="outline"
        disabled
        class="h-auto min-h-16 w-full justify-between rounded-2xl !bg-white px-4 py-4 text-base font-normal shadow-none dark:!bg-card"
      >
        <span>检查更新</span>
        <ChevronRight class="size-5 text-muted-foreground" />
      </Button>
    </SettingsGroup>
    <section
      v-else
      class="grid gap-2 overflow-hidden rounded-2xl border border-border bg-card p-4"
    >
      <UpdateSettings />
    </section>

    <SettingsGroup v-if="isMobile" title="关于" mobile>
      <Button
        as-child
        variant="outline"
        class="h-auto min-h-16 w-full justify-between rounded-2xl !bg-white px-4 py-4 text-base font-normal shadow-none dark:!bg-card"
      >
        <a
          href="https://github.com/zmy-devs/ym-video/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>反馈问题</span>
          <ChevronRight class="size-5 text-muted-foreground" />
        </a>
      </Button>
      <Button
        as="div"
        variant="outline"
        class="h-auto min-h-16 w-full justify-between gap-4 rounded-2xl !bg-white px-4 py-4 text-base font-normal shadow-none dark:!bg-card"
      >
        <span>版本</span>
        <span class="text-muted-foreground">{{ version }}</span>
      </Button>
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
import { SwitchRoot, SwitchThumb } from 'reka-ui';
import { ChevronRight } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
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
      version.value = `v${current}`;
    })
    .catch(() => {
      version.value = '读取失败';
    });
});
</script>
