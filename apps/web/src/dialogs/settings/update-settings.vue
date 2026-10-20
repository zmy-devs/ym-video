<template>
  <section class="flex flex-col gap-8">
    <div>
      <h2 class="border-b px-4 py-3 text-sm">更新配置</h2>
      <SettingsField
        id="settings-auto-update"
        v-slot="{ control }"
        label="自动更新"
        description="开启后自动检查并下载更新，安装前由你确认"
      >
        <SwitchRoot
          v-bind="control"
          :model-value="update.autoUpdate"
          class="h-5 w-9 shrink-0 rounded-full border border-transparent bg-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:bg-primary"
          @update:model-value="update.setAutoUpdate"
        >
          <SwitchThumb
            class="size-4 block translate-x-0.5 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-4.5"
          />
        </SwitchRoot>
      </SettingsField>
    </div>
    <div>
      <h2 class="border-b px-4 py-3 text-sm">更新</h2>
      <div class="min-h-17.5 flex items-center gap-2.5 px-4 py-3 text-sm">
        <div class="min-w-0 flex-1 space-y-1">
          <h3 class="font-medium">更新内容</h3>
          <p class="text-muted-foreground">查看当前版本更新内容</p>
        </div>
        <Button as-child size="sm" variant="outline">
          <a :href="releaseUrl" target="_blank" rel="noopener noreferrer"
            >查看</a
          >
        </Button>
      </div>
      <div class="min-h-17.5 flex items-center gap-2.5 px-4 py-3 text-sm">
        <div class="min-w-0 flex-1 space-y-1">
          <h3 class="font-medium">检查更新</h3>
          <p class="text-muted-foreground">检查当前版本是否有可用更新</p>
        </div>
        <Button
          v-if="update.status === 'idle' || update.status === 'error'"
          size="sm"
          @click="update.check"
        >
          检查更新
        </Button>
        <span v-else class="text-sm">{{ updateLabel }}</span>
        <Button
          v-if="update.status === 'downloaded'"
          size="sm"
          :disabled="update.installing"
          @click="update.install"
        >
          {{ update.installing ? '正在重启…' : '安装更新' }}
        </Button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { SwitchRoot, SwitchThumb } from 'reka-ui';
import { Button } from '@/components/ui/button';
import { useUpdateStore } from '@/stores/update';
import SettingsField from './settings-field.vue';

// 设置页直接展示应用级更新任务。
const update = useUpdateStore();

// 与 ym-printer 一致，在检查按钮位置显示更新状态。
const updateLabel = computed(() => {
  switch (update.status) {
    case 'checking':
      return '正在检查更新...';
    case 'up-to-date':
      return '已是最新版';
    case 'downloading':
      return `下载中: ${update.progress}%`;
    default:
      return '';
  }
});

// 优先查看当前安装版本对应的发布说明。
const releaseUrl = computed(() =>
  update.version
    ? `https://github.com/2514765066/ym-video/releases/tag/v${encodeURIComponent(update.version)}`
    : 'https://github.com/2514765066/ym-video/releases',
);
</script>
