<template>
  <CreateAccountDialog />
  <CreateInvitationDialog />
  <SettingsDialog />
  <ConfirmDialog ref="confirmDialog" />
</template>

<script setup lang="ts">
import { onScopeDispose, useTemplateRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import ConfirmDialog from '@ym-video/ui/common/confirm-dialog.vue';
import CreateAccountDialog from './create-account-dialog.vue';
import CreateInvitationDialog from './create-invitation-dialog.vue';
import SettingsDialog from './settings-dialog.vue';
import { eventBus } from '@/utils/event-bus';

// 全局弹窗与当前管理路由保持同步。
const route = useRoute();
const confirmDialog = useTemplateRef('confirmDialog');
onScopeDispose(
  eventBus.on('confirm:show', (options) => confirmDialog.value?.show(options)),
);
onScopeDispose(
  eventBus.on('dialogs:close', () => confirmDialog.value?.close()),
);
watch(
  () => route.fullPath,
  () => eventBus.emit('dialogs:close'),
);
</script>
