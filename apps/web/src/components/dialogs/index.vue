<template>
  <SourceDialog />
  <SearchDialog />
  <SettingsDialog />
  <ConfirmDialog ref="confirmDialog" />
</template>

<script setup lang="ts">
import { onScopeDispose, useTemplateRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import SourceDialog from './source-dialog.vue';
import SearchDialog from './search-dialog.vue';
import SettingsDialog from './settings-dialog.vue';
import ConfirmDialog from '@ym-video/ui/common/confirm-dialog.vue';
import { eventBus } from '@/utils/event-bus';

// 确认框的通用命令接入本应用事件。
const confirmDialog = useTemplateRef('confirmDialog');
onScopeDispose(
  eventBus.on('confirm:show', (options) => confirmDialog.value?.show(options)),
);
onScopeDispose(
  eventBus.on('dialogs:close', () => confirmDialog.value?.close()),
);

// 页面切换时关闭全局弹窗，避免保留上个页面的草稿与操作目标。
const route = useRoute();

watch(
  () => route.fullPath,
  () => eventBus.emit('dialogs:close'),
);
</script>
