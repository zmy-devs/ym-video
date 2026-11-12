<template>
  <Dialog
    v-model:open="open"
    :title="sourceId ? '编辑播放源' : '添加播放源'"
    :description="description"
    class="z-60"
    overlay-class="z-60"
    @close-auto-focus="handleCloseFocus"
  >
    <form class="grid gap-6" novalidate @submit.prevent="handleSave">
      <Field
        v-slot="{ control }"
        label="名称（备注）"
        :error="nameError"
        :disabled="pending"
      >
        <Input
          v-bind="control"
          v-model="name"
          required
          maxlength="80"
          autocomplete="off"
          placeholder="例如：我的播放源"
          :disabled="pending"
          @update:model-value="nameError = ''"
        />
      </Field>
      <Field
        v-slot="{ control }"
        label="接口 URL"
        :error="urlError"
        :disabled="pending"
      >
        <Input
          v-bind="control"
          v-model="url"
          type="url"
          required
          maxlength="2048"
          autocomplete="off"
          spellcheck="false"
          placeholder="https://example.com/api.php/provide/vod/"
          :disabled="pending"
          @update:model-value="urlError = ''"
        />
      </Field>
      <DialogFooter>
        <Button type="submit" :disabled="pending">
          <LoaderCircle v-if="pending" class="animate-spin" />
          {{ pending ? '正在验证…' : submitLabel }}
        </Button>
      </DialogFooter>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LoaderCircle } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Input } from '@ym-video/ui/components/input';
import Dialog from '@ym-video/ui/common/dialog.vue';
import { DialogFooter } from '@ym-video/ui/components/dialog';
import Field from '@ym-video/ui/common/field.vue';
import { useLibraryStore } from '@/stores/library-store';
import { successToast } from '@ym-video/ui/lib/toast';
import { eventBus } from '@/utils/event-bus';
import { isMobile } from '@/platform';
import { sourceFormSchema } from '@/schemas/source';
import { useRequest } from '@/composables/use-request';

// 根组件只挂载一个实例，通过事件区分新增与编辑。
const open = ref(false);

// 编辑沿用原 ID，名称和接口变化不改变历史记录的源归属。
const sourceId = ref('');

// 提交按钮随当前操作切换文案。
const submitLabel = computed(() => (sourceId.value ? '保存' : '确定'));

// 弹窗说明随新增或编辑切换。
const description = computed(() =>
  sourceId.value
    ? '修改名称和接口地址，保存前验证分类是否可用。'
    : '填写名称和接口地址，确定后验证分类是否可用。',
);

// 验证与保存统一交给播放源数据层。
const library = useLibraryStore();

// 编辑当前播放源后清理旧接口的分类路由。
const route = useRoute();

// 分类路由与更新后的分类列表保持一致。
const router = useRouter();

// 本次新增或编辑的名称备注。
const name = ref('');

// 待验证的接口地址。
const url = ref('');

// 名称错误使用现有表单组件展示。
const nameError = ref('');

// 地址、网络和分类验证错误显示在 URL 字段。
const urlError = ref('');

// 表单关闭或重新提交时取消本次接口验证。
const {
  execute: saveSource,
  cancel,
  pending,
} = useRequest(
  async (signal, input: { name: string; url: string }, id: string) => {
    try {
      if (id) {
        await library.updateSource(id, input.name, input.url, signal);
      } else {
        await library.addSource(input.name, input.url, signal);
      }
      if (signal.aborted) {
        return;
      }
      open.value = false;
      successToast(id ? '播放源已更新' : '播放源已添加');
      if (id === library.selected && route.path.startsWith('/category')) {
        await router.push('/category');
      }
    } catch (cause) {
      if (!signal.aborted) {
        urlError.value =
          cause instanceof Error ? cause.message : '验证失败，请重试';
      }
    }
  },
);
watch(open, cancel, { flush: 'sync' });

// 每次打开从数据层读取最新值，不复用上一条记录的草稿。
const handleShow = (id?: string) => {
  if (open.value) {
    return;
  }

  const source = library.customSources.find((item) => item.id === id);

  if (id && !source) {
    return;
  }

  sourceId.value = source?.id ?? '';
  name.value = source?.name ?? '';
  url.value = source?.url ?? '';
  nameError.value = '';
  urlError.value = '';
  open.value = true;
};

onScopeDispose(eventBus.on('source:show', handleShow));
onScopeDispose(
  eventBus.on('dialogs:close', () => {
    open.value = false;
  }),
);

// 移动端恢复抽屉内的原按钮，桌面端恢复已关闭菜单的入口。
const handleCloseFocus = (event: Event) => {
  if (isMobile) {
    return;
  }

  event.preventDefault();
  eventBus.emit('source-switcher:focus');
};

// 提交时由 Zod 校验并规范化输入，再验证接口分类。
const handleSave = () => {
  if (pending.value) {
    return;
  }
  nameError.value = '';
  urlError.value = '';
  const result = sourceFormSchema.safeParse({
    name: name.value,
    url: url.value,
  });
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    nameError.value = errors.name?.[0] ?? '';
    urlError.value = errors.url?.[0] ?? '';
    return;
  }
  return saveSource(result.data, sourceId.value);
};
</script>
