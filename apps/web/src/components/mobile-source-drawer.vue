<template>
  <CheckboxGroupRoot
    v-if="editing"
    v-model="selected"
    orientation="vertical"
    class="grid gap-6 px-4 pt-2 pb-[calc(1.5rem+var(--mobile-safe-bottom))]"
  >
    <SettingsGroup title="我的播放源" mobile>
      <ButtonGroupItem
        v-for="source in library.customSources"
        :key="source.id"
        as="div"
        class="relative p-0"
      >
        <CheckboxRoot :value="source.id" as-child>
          <Button
            variant="ghost"
            class="group/source h-full w-full justify-start gap-3 rounded-[inherit] px-4 py-0 text-base font-normal"
          >
            <span class="min-w-0 flex-1 truncate pr-10 text-left">{{
              source.name
            }}</span>
            <span
              class="flex size-5 shrink-0 items-center justify-center rounded-sm border border-input group-data-[state=checked]/source:border-primary group-data-[state=checked]/source:bg-primary group-data-[state=checked]/source:text-primary-foreground"
            >
              <CheckboxIndicator as-child>
                <Check class="size-3.5" />
              </CheckboxIndicator>
            </span>
          </Button>
        </CheckboxRoot>
        <Button
          variant="ghost"
          size="icon"
          class="absolute top-1/2 right-12 -translate-y-1/2"
          @click="emit('edit', source.id)"
        >
          <Pencil class="size-4" />
        </Button>
      </ButtonGroupItem>
      <p
        v-if="!library.customSources.length"
        class="px-4 py-3 text-sm text-muted-foreground"
      >
        暂无自定义播放源
      </p>
    </SettingsGroup>
  </CheckboxGroupRoot>
  <RadioGroupRoot
    v-else
    :model-value="library.selected"
    orientation="vertical"
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
        <ButtonGroupItem class="group/source justify-start">
          <span class="min-w-0 flex-1 truncate text-left">{{
            source.name
          }}</span>
          <span
            class="flex size-5 shrink-0 items-center justify-center rounded-full border border-input group-data-[state=checked]/source:border-primary"
          >
            <RadioGroupIndicator class="size-2.5 rounded-full bg-primary" />
          </span>
        </ButtonGroupItem>
      </RadioGroupItem>
    </SettingsGroup>

    <SettingsGroup
      v-if="library.customSources.length"
      title="我的播放源"
      mobile
    >
      <RadioGroupItem
        v-for="source in library.customSources"
        :key="source.id"
        :value="source.id"
        as-child
      >
        <ButtonGroupItem class="group/source justify-start">
          <span class="min-w-0 flex-1 truncate text-left">{{
            source.name
          }}</span>
          <span
            class="flex size-5 shrink-0 items-center justify-center rounded-full border border-input group-data-[state=checked]/source:border-primary"
          >
            <RadioGroupIndicator class="size-2.5 rounded-full bg-primary" />
          </span>
        </ButtonGroupItem>
      </RadioGroupItem>
    </SettingsGroup>
  </RadioGroupRoot>
</template>

<script setup lang="ts">
import { Check, Pencil } from 'lucide-vue-next';
import {
  CheckboxGroupRoot,
  CheckboxIndicator,
  CheckboxRoot,
  RadioGroupIndicator,
  RadioGroupItem,
  RadioGroupRoot,
} from 'reka-ui';
import type { AcceptableValue } from 'reka-ui';
import { Button } from '@ym-video/ui/components/button';
import ButtonGroupItem from '@ym-video/ui/common/button-group-item.vue';
import SettingsGroup from '@ym-video/ui/common/settings-group.vue';
import { useLibraryStore } from '@/stores/library-store';

// 编辑模式仅展示本机自定义源的多选列表。
defineProps<{ editing: boolean }>();

// 多选结果交给上层统一执行批量删除。
const selected = defineModel<string[]>('selected', { required: true });

// 移动端抽屉提供播放源选择和管理入口，操作交给统一控制器。
const emit = defineEmits<{
  select: [id: AcceptableValue];
  edit: [id?: string];
}>();

// 平台源和本机自定义源共用当前单选状态。
const library = useLibraryStore();
</script>
