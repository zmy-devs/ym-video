<template>
  <Dialog
    v-model:open="open"
    :title="sourceId ? '编辑播放源' : '添加播放源'"
    description="修改名称和接口地址，保存前验证分类是否可用。"
    class="z-60"
    overlay-class="z-60"
    @close-auto-focus="handleCloseFocus"
  >
    <form class="grid gap-6" novalidate @submit="handleSave">
      <VeeField v-slot="{ componentField, errors }" name="name">
        <Field
          v-slot="{ control }"
          label="名称（备注）"
          :error="errors[0]"
          :disabled="pending"
        >
          <Input
            v-bind="{ ...componentField, ...control }"
            required
            maxlength="80"
            autocomplete="off"
            placeholder="例如：我的播放源"
            :disabled="pending"
          />
        </Field>
      </VeeField>
      <VeeField v-slot="{ componentField, errors }" name="url">
        <Field
          v-slot="{ control }"
          label="接口 URL"
          :error="errors[0]"
          :disabled="pending"
        >
          <Input
            v-bind="{ ...componentField, ...control }"
            type="url"
            required
            maxlength="2048"
            autocomplete="off"
            spellcheck="false"
            placeholder="https://example.com/api.php/provide/vod/"
            :disabled="pending"
          />
        </Field>
      </VeeField>
      <DialogFooter>
        <Button type="submit" :disabled="pending">
          <LoaderCircle v-if="pending" class="animate-spin" />
          {{ pending ? '正在验证…' : '确定' }}
        </Button>
      </DialogFooter>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import { Field as VeeField, useForm } from 'vee-validate';
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

// 验证与保存统一交给播放源数据层。
const library = useLibraryStore();

// 编辑当前播放源后清理旧接口的分类路由。
const route = useRoute();

// 分类路由与更新后的分类列表保持一致。
const router = useRouter();

// 表单统一管理输入、字段错误与接口地址规范化。
const { handleSubmit, resetForm, setFieldError } = useForm({
  validationSchema: sourceFormSchema,
  initialValues: { name: '', url: '' },
});

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
        setFieldError(
          'url',
          cause instanceof Error ? cause.message : '验证失败，请重试',
        );
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
  resetForm({ values: { name: source?.name ?? '', url: source?.url ?? '' } });
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
const handleSave = handleSubmit((values) => saveSource(values, sourceId.value));
</script>
