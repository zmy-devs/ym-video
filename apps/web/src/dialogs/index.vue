<template>
  <SourceDialog />
  <SearchDialog />
  <SettingsDialog />
  <CreateAccountDialog />
  <CreateInvitationDialog />
  <ConfirmDialog />
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import SourceDialog from './source-dialog.vue';
import SearchDialog from './search-dialog.vue';
import SettingsDialog from './settings-dialog.vue';
import CreateAccountDialog from './create-account-dialog.vue';
import CreateInvitationDialog from './create-invitation-dialog.vue';
import ConfirmDialog from './confirm-dialog.vue';
import { eventBus } from '@/utils/event-bus';

// 页面切换时关闭全局弹窗，避免保留上个页面的草稿与操作目标。
const route = useRoute();

watch(
  () => route.fullPath,
  () => eventBus.emit('dialogs:close'),
);
</script>
