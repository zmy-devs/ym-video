<template>
  <SettingsGroup v-if="mobile" title="账号" mobile>
    <ButtonGroupItem as="div">
      <span>邮箱</span>
      <span class="max-w-[65%] truncate text-sm text-muted-foreground">{{
        session.data?.user.email
      }}</span>
    </ButtonGroupItem>
    <ButtonGroupItem @click="handleEdit('username')">
      <span>用户名</span>
      <span
        class="ml-auto max-w-[55%] truncate text-sm text-muted-foreground"
        >{{ session.data?.user.username }}</span
      >
      <ChevronRight class="size-5 stroke-muted-foreground" />
    </ButtonGroupItem>
    <ButtonGroupItem @click="handleEdit('password')">
      <span>修改密码</span>
      <ChevronRight class="size-5 stroke-muted-foreground" />
    </ButtonGroupItem>
  </SettingsGroup>
  <section v-else class="flex flex-col gap-8">
    <SettingsGroup title="账号信息">
      <div class="min-h-17.5 flex items-center gap-6 px-4 py-3 text-sm">
        <div class="min-w-0 flex-1 space-y-1">
          <h3 class="font-medium">邮箱</h3>
          <p class="text-muted-foreground">当前账号的邮箱地址</p>
        </div>
        <Tooltip :label="session.data?.user.email || ''" side="left">
          <p class="w-60 truncate text-right">{{ session.data?.user.email }}</p>
        </Tooltip>
      </div>
      <SettingsField
        id="settings-username-action"
        v-slot="{ control }"
        label="用户名"
        description="3～30 位中英文、数字、下划线或句点"
      >
        <Button size="sm" v-bind="control" @click="handleEdit('username')">
          修改用户名
        </Button>
      </SettingsField>
    </SettingsGroup>
    <SettingsGroup title="账号安全">
      <SettingsField
        id="settings-password-action"
        v-slot="{ control }"
        label="密码"
        description="修改后，其他设备需要重新登录"
      >
        <Button size="sm" v-bind="control" @click="handleEdit('password')">
          修改密码
        </Button>
      </SettingsField>
    </SettingsGroup>
  </section>
  <Dialog v-model:open="open">
    <DialogContent
      class="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      :show-close-button="!pending"
      @interact-outside="handlePendingClose"
      @escape-key-down="handlePendingClose"
    >
      <DialogHeader>
        <DialogTitle>{{
          editing === 'username' ? '修改用户名' : '修改密码'
        }}</DialogTitle>
        <DialogDescription>{{
          editing === 'username'
            ? '设置当前账号的用户名'
            : '验证当前密码后设置新的密码'
        }}</DialogDescription>
      </DialogHeader>
      <UsernameForm
        v-if="open && editing === 'username'"
        v-model:pending="pending"
        :client="client"
        @saved="handleSaved"
      />
      <PasswordForm
        v-else-if="open && editing === 'password'"
        v-model:pending="pending"
        :client="client"
        @saved="handleSaved"
      />
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ChevronRight } from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import ButtonGroupItem from '@ym-video/ui/common/button-group-item.vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@ym-video/ui/components/dialog';
import SettingsField from '@ym-video/ui/common/settings-field.vue';
import SettingsGroup from '@ym-video/ui/common/settings-group.vue';
import Tooltip from '@ym-video/ui/common/tooltip.vue';
import UsernameForm from './username-form.vue';
import PasswordForm from './password-form.vue';
import type { AccountClient } from '@ym-video/account/client';

// 两端的账号设置均通过按钮打开同一套编辑弹窗。
const props = defineProps<{ client: AccountClient; mobile?: boolean }>();

// 表单提交状态同时约束设置弹窗的关闭。
const pending = defineModel<'username' | 'password' | null>('pending', {
  required: true,
});

// 列表直接展示服务端已确认的账号信息。
const session = props.client.useSession();

// 同一时刻只编辑一种账号信息。
const editing = ref<'username' | 'password'>('username');

// 单个弹窗承载当前正在编辑的表单。
const open = ref(false);

// 打开时挂载新表单，草稿从当前会话初始化。
const handleEdit = (value: 'username' | 'password') => {
  editing.value = value;
  open.value = true;
};

// 保存成功后返回账号选项列表。
const handleSaved = () => {
  open.value = false;
};

// 提交期间保留当前表单，等待保存结果。
const handlePendingClose = (event: Event) => {
  if (pending.value) {
    event.preventDefault();
  }
};
</script>
