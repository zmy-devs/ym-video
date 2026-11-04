<template>
  <SettingsDialog
    v-model:open="open"
    v-model:selected="selected"
    :items="navigation"
    :pending="!!pending"
    @close-auto-focus="handleCloseFocus"
  >
    <template #appearance>
      <AppearanceSettings
        v-model:mode="theme.mode"
        v-model:color="theme.color"
      />
    </template>
    <template #account>
      <AccountSettings :client="authClient" v-model:pending="pending" />
    </template>
    <template #about>
      <section>
        <h2 class="border-b px-4 py-3 text-sm">关于</h2>
        <div class="flex items-center justify-between px-4 py-3 text-sm">
          <span>反馈问题</span>
          <Button as-child size="sm" variant="outline">
            <a
              href="https://github.com/zmy-devs/ym-video/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              反馈
            </a>
          </Button>
        </div>
      </section>
    </template>
  </SettingsDialog>
</template>

<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import { CircleAlert, Palette, UserRound } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import SettingsDialog from '@ym-video/ui/common/settings-dialog.vue';
import AppearanceSettings from '@ym-video/ui/common/appearance-settings.vue';
import AccountSettings from '@ym-video/account/settings.vue';
import { authClient } from '@/services/auth';
import { useThemeStore } from '@/stores/theme-store';
import { eventBus } from '@/utils/event-bus';

// 管理应用提供外观、账号及反馈设置。
const open = ref(false);
const selected = ref('appearance');
const pending = ref<'username' | 'password' | null>(null);
const theme = useThemeStore();
const session = authClient.useSession();
const navigation = [
  { value: 'appearance', label: '外观', icon: Palette },
  { value: 'account', label: '账号', icon: UserRound },
  { value: 'about', label: '关于', icon: CircleAlert },
];
watch(open, () => {
  selected.value = 'appearance';
  pending.value = null;
});
watch(
  () => session.value.data?.user.id,
  () => {
    open.value = false;
  },
  { flush: 'sync' },
);
onScopeDispose(
  eventBus.on('settings:show', () => {
    if (session.value.data?.user) {
      open.value = true;
    }
  }),
);
onScopeDispose(
  eventBus.on('dialogs:close', () => {
    open.value = false;
  }),
);

// 设置窗口关闭后返回账号入口。
const handleCloseFocus = (event: Event) => {
  event.preventDefault();
  document.getElementById('account-menu-trigger')?.focus();
};
</script>
