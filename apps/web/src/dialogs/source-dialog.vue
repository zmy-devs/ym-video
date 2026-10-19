<template>
  <Dialog v-model:open="open">
    <DialogContent @close-auto-focus="handleCloseFocus">
      <DialogHeader>
        <DialogTitle>{{ sourceId ? '编辑播放源' : '添加播放源' }}</DialogTitle>
        <DialogDescription>
          {{
            sourceId
              ? '修改名称和接口地址，保存前验证分类是否可用。'
              : '填写名称和接口地址，确定后验证分类是否可用。'
          }}
        </DialogDescription>
      </DialogHeader>
      <form class="grid gap-6" novalidate @submit.prevent="handleSave">
        <FormField
          id="source-name"
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
        </FormField>
        <FormField
          id="source-url"
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
        </FormField>
        <DialogFooter>
          <Button type="submit" :disabled="pending">
            <LoaderCircle v-if="pending" class="animate-spin" />
            {{ pending ? '正在验证…' : submitLabel }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LoaderCircle } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import FormField from '@/components/common/form-field.vue';
import { useLibraryStore } from '@/stores/library';
import { successToast } from '@/utils/toast';
import { eventBus } from '@/utils/event-bus';

// 根组件只挂载一个实例，通过事件区分新增与编辑。
const open = ref(false);

// 编辑沿用原 ID，名称和接口变化不改变历史记录的源归属。
const sourceId = ref('');

// 提交按钮随当前操作切换文案。
const submitLabel = computed(() => (sourceId.value ? '保存' : '确定'));

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

// 验证期间阻止重复提交，但允许关闭并取消请求。
const pending = ref(false);

// 关闭或卸载弹窗时丢弃尚未完成的验证。
let controller: AbortController | undefined;

watch(
  open,
  () => {
    controller?.abort();
    controller = undefined;
    pending.value = false;
  },
  { flush: 'sync' },
);

onScopeDispose(() => controller?.abort());

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

// 菜单项已卸载，关闭后将焦点恢复到播放源菜单按钮。
const handleCloseFocus = (event: Event) => {
  event.preventDefault();
  document.getElementById('source-switcher')?.focus();
};

// 新增和编辑共用校验流程，失败保留输入以便修正。
const handleSave = async () => {
  if (pending.value) {
    return;
  }

  name.value = name.value.trim();
  nameError.value = '';
  urlError.value = '';

  if (!name.value || name.value.length > 80) {
    nameError.value = '名称需为 1～80 个字符';
    document.getElementById('source-name')?.focus();
    return;
  }

  // 每次提交独立持有取消信号，旧请求不能影响重新打开的表单。
  const requestController = new AbortController();

  controller = requestController;
  pending.value = true;

  try {
    if (sourceId.value) {
      await library.updateSource(
        sourceId.value,
        name.value,
        url.value,
        requestController.signal,
      );
    } else {
      await library.addSource(name.value, url.value, requestController.signal);
    }

    if (!requestController.signal.aborted) {
      open.value = false;
      successToast(sourceId.value ? '播放源已更新' : '播放源已添加');

      if (
        sourceId.value === library.selected &&
        route.path.startsWith('/category')
      ) {
        await router.push('/category');
      }
    }
  } catch (cause) {
    if (!requestController.signal.aborted) {
      urlError.value =
        cause instanceof Error ? cause.message : '验证失败，请重试';
    }
  } finally {
    if (controller === requestController) {
      pending.value = false;
      controller = undefined;
    }
  }
};
</script>
