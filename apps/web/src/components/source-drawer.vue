<template>
  <RadioGroupRoot
    :model-value="library.selected"
    orientation="vertical"
    aria-label="播放源"
    class="grid gap-6 px-4 pt-2 pb-[calc(1.5rem+var(--mobile-safe-bottom))]"
    @update:model-value="emit('select', $event)"
  >
    <SettingsGroup v-if="library.platformSources.length" title="播放源" mobile>
      <RadioGroupItem
        v-for="source in library.platformSources"
        :key="source.id"
        :value="source.id"
        as-child
      >
        <Button
          variant="outline"
          class="group/source h-auto min-h-16 w-full justify-start gap-3 rounded-2xl !bg-white px-4 py-3 text-base font-normal shadow-none dark:!bg-card"
        >
          <span class="min-w-0 flex-1 truncate text-left">{{
            source.name
          }}</span>
          <span
            aria-hidden="true"
            class="flex size-5 shrink-0 items-center justify-center rounded-full border border-input group-data-[state=checked]/source:border-primary"
          >
            <RadioGroupIndicator class="size-2.5 rounded-full bg-primary" />
          </span>
        </Button>
      </RadioGroupItem>
    </SettingsGroup>

    <SettingsGroup
      v-if="library.customSources.length"
      title="我的播放源"
      mobile
    >
      <div
        v-for="source in library.customSources"
        :key="source.id"
        class="relative rounded-2xl border border-border bg-white dark:bg-card"
      >
        <RadioGroupItem :value="source.id" as-child>
          <Button
            variant="ghost"
            class="group/source h-auto min-h-16 w-full justify-start gap-3 rounded-[inherit] px-4 py-3 text-base font-normal"
          >
            <span class="min-w-0 flex-1 truncate pr-20 text-left">{{
              source.name
            }}</span>
            <span
              aria-hidden="true"
              class="flex size-5 shrink-0 items-center justify-center rounded-full border border-input group-data-[state=checked]/source:border-primary"
            >
              <RadioGroupIndicator class="size-2.5 rounded-full bg-primary" />
            </span>
          </Button>
        </RadioGroupItem>
        <div class="absolute top-1/2 right-12 flex -translate-y-1/2 gap-1">
          <Button
            variant="ghost"
            size="icon"
            :aria-label="`编辑播放源：${source.name}`"
            @click="emit('edit', source.id)"
          >
            <Pencil class="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            :aria-label="`删除播放源：${source.name}`"
            class="text-destructive hover:text-destructive"
            @click="emit('delete', source)"
          >
            <Trash2 class="size-4" />
          </Button>
        </div>
      </div>
    </SettingsGroup>
  </RadioGroupRoot>
</template>

<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next';
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui';
import type { AcceptableValue } from 'reka-ui';
import { Button } from '@ym-video/ui/components/button';
import SettingsGroup from '@ym-video/ui/common/settings-group.vue';
import { useLibraryStore } from '@/stores/library-store';
import type { CustomSource } from '@/types';

// 移动端抽屉提供播放源选择和管理入口，操作交给统一控制器。
const emit = defineEmits<{
  select: [id: AcceptableValue];
  edit: [id?: string];
  delete: [source: CustomSource];
}>();

// 平台源和本机自定义源共用当前单选状态。
const library = useLibraryStore();
</script>
