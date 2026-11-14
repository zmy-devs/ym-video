<template>
  <SettingsGroup v-if="mobile" title="更新" mobile>
    <ButtonGroupItem as="div">
      <span id="settings-mobile-auto-update">自动更新</span>
      <SwitchRoot
        :model-value="update.autoUpdate"
        class="h-5 w-9 shrink-0 rounded-full border border-transparent bg-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:bg-primary"
        @update:model-value="update.setAutoUpdate"
      >
        <SwitchThumb
          class="size-4 block translate-x-0.5 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-4.5"
        />
      </SwitchRoot>
    </ButtonGroupItem>
    <ButtonGroupItem
      :disabled="
        ['checking', 'downloading', 'installing'].includes(update.status)
      "
      @click="handleUpdate"
    >
      <span>检查更新</span>
      <span
        v-if="mobileActionLabel"
        class="ml-auto text-sm text-muted-foreground"
        >{{ mobileActionLabel }}</span
      >
      <ChevronRight class="size-5 stroke-muted-foreground" />
    </ButtonGroupItem>
  </SettingsGroup>
  <section v-else class="flex flex-col gap-8">
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
          <h3 class="font-medium">检查更新</h3>
          <p class="text-muted-foreground">
            {{
              update.version
                ? `当前版本 v${update.version}`
                : '检查可用的新版本'
            }}
          </p>
        </div>
        <Button v-if="update.status === 'idle'" size="sm" @click="update.check">
          检查更新
        </Button>
        <Button
          v-else-if="
            ['downloaded', 'installing', 'installer-opened'].includes(
              update.status,
            )
          "
          size="sm"
          :disabled="update.status === 'installing'"
          @click="update.install"
        >
          {{ installLabel }}
        </Button>
      </div>
      <p
        v-if="update.message"
        role="status"
        class="px-4 text-sm text-muted-foreground"
      >
        {{ update.message }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { SwitchRoot, SwitchThumb } from 'reka-ui';
import { ChevronRight } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import ButtonGroupItem from '@ym-video/ui/common/button-group-item.vue';
import { useUpdateStore } from '@/stores/update-store';
import { isDesktop } from '@/platform';
import SettingsField from '@ym-video/ui/common/settings-field.vue';
import SettingsGroup from '@ym-video/ui/common/settings-group.vue';

// 同一更新任务分别适配移动设置列表和桌面设置面板。
defineProps<{ mobile?: boolean }>();

// 设置页直接展示应用级更新任务。
const update = useUpdateStore();

// 按平台和安装阶段提示下一步操作。
const installLabel = computed(() => {
  if (update.status === 'installing') {
    return '正在安装…';
  }

  if (update.status === 'installer-opened') {
    return '再次安装';
  }

  return isDesktop ? '安装并重启' : '安装更新';
});

// 移动端保留检查更新标题，行尾展示进度或安装操作。
const mobileActionLabel = computed(() => {
  if (update.status === 'idle') {
    return '';
  }

  if (update.status === 'checking') {
    return '正在检查…';
  }

  if (update.status === 'downloading') {
    return update.progress === null ? '正在下载…' : `${update.progress}%`;
  }

  return installLabel.value;
});

// 移动端操作行按任务阶段发起检查或安装。
const handleUpdate = async () => {
  if (update.status === 'idle') {
    await update.check();

    return;
  }

  await update.install();
};
</script>
