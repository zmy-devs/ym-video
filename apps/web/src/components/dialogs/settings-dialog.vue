<template>
  <SettingsDialog
    v-model:open="open"
    v-model:selected="selected"
    :items="navigation"
    :pending="!!pending"
    @close-auto-focus="handleCloseFocus"
  >
    <template #appearance
      ><AppearanceSettings
        v-model:mode="theme.mode"
        v-model:color="theme.color"
    /></template>
    <template #account
      ><AccountSettings v-model:pending="pending" :client="authClient"
    /></template>
    <template #update><UpdateSettings /></template>
    <template #about><AboutSettings /></template>
  </SettingsDialog>
</template>

<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import {
  CircleAlert,
  Palette,
  UserRound,
  CircleArrowUp,
} from 'lucide-vue-next';
import SettingsDialog from '@ym-video/ui/common/settings-dialog.vue';
import AppearanceSettings from '@ym-video/ui/common/appearance-settings.vue';
import AccountSettings from '@ym-video/ui/account/settings.vue';
import { useThemeStore } from '@/stores/theme-store';
import AboutSettings from './settings/about-settings.vue';
import UpdateSettings from './settings/update-settings.vue';
import { authClient } from '@/services/auth';
import { eventBus } from '@/utils/event-bus';

// 当前应用挂载一个设置弹窗。
const open = ref(false);

// 每次打开默认进入外观设置。
const selected = ref('appearance');

// 设置选择直接更新当前应用的外观。
const theme = useThemeStore();

// 账号提交期间禁止切换分类和手动关闭，切页仍可强制清理。
const pending = ref<'username' | 'password' | null>(null);

// 两端共用设置分类，更新任务由当前平台处理。
const navigation = [
  { value: 'appearance', label: '外观', icon: Palette },
  { value: 'account', label: '账号', icon: UserRound },
  { value: 'update', label: '更新', icon: CircleArrowUp },
  { value: 'about', label: '关于', icon: CircleAlert },
];

// 会话身份变化后不保留上一个账号的草稿。
const session = authClient.useSession();

watch(
  () => session.value.data?.user.id,
  () => {
    open.value = false;
  },
  { flush: 'sync' },
);

watch(open, () => {
  selected.value = 'appearance';
  pending.value = null;
});

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

// 关闭后回到用户信息按钮，兼容侧栏收起状态。
const handleCloseFocus = (event: Event) => {
  event.preventDefault();
  document.getElementById('account-menu-trigger')?.focus();
};
</script>
