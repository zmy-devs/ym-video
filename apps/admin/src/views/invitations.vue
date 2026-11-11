<template>
  <section class="mx-auto flex min-h-full max-w-6xl flex-col gap-6 p-6 lg:p-10">
    <header>
      <h1 id="invitations-heading" class="text-2xl font-semibold">邀请管理</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        通过一次性邀请码分发账号，每个邀请码仅可注册一次。
      </p>
    </header>
    <div
      v-if="!empty || search"
      class="flex items-center justify-between gap-4"
    >
      <InputGroup class="w-64">
        <InputGroupInput
          id="invitations-search"
          v-model="search"
          placeholder="搜索名称或邀请码…"
        />
        <InputGroupAddon><Search /></InputGroupAddon>
      </InputGroup>
      <Button id="invitations-create" @click="eventBus.emit('invitation:show')"
        ><Plus />新增邀请</Button
      >
    </div>
    <CommonEmpty
      v-if="empty"
      class="min-h-80"
      :label="search ? '没有找到匹配的邀请码' : '暂无邀请码'"
      :description="
        search
          ? '换个关键词，或清除搜索后查看全部邀请码。'
          : '创建邀请码，邀请他人注册普通用户账号。'
      "
      :action="search ? '清除搜索' : '新增邀请'"
      :icon="Link"
      @action="search ? (search = '') : eventBus.emit('invitation:show')"
    />
    <div
      v-else-if="status === 'loading' && !loaded"
      class="flex min-h-80 items-center justify-center gap-2 text-muted-foreground"
    >
      <LoaderCircle class="size-4 animate-spin" />
      正在加载邀请…
    </div>
    <template v-else>
      <div>
        <div class="overflow-hidden rounded-md border">
          <Table class="table-fixed">
            <TableHeader class="bg-muted"
              ><TableRow
                ><TableHead class="w-48 pl-4">分享名称</TableHead
                ><TableHead>邀请码</TableHead
                ><TableHead class="w-28 text-center">状态</TableHead
                ><TableHead class="w-20 pr-4 text-right"
                  >操作</TableHead
                ></TableRow
              ></TableHeader
            >
            <TableBody>
              <TableRow v-if="status === 'loading'"
                ><TableCell
                  colspan="4"
                  class="h-40 text-center text-muted-foreground"
                  ><LoaderCircle
                    class="mr-2 inline size-4 animate-spin"
                  />正在加载邀请…</TableCell
                ></TableRow
              >
              <TableRow v-else-if="error"
                ><TableCell colspan="4" class="h-40 text-center"
                  ><p class="text-destructive">{{ error }}</p>
                  <Button variant="link" @click="refresh"
                    >重试</Button
                  ></TableCell
                ></TableRow
              >
              <template v-else>
                <TableRow v-for="invitation in items" :key="invitation.id">
                  <TableCell class="pl-4 font-medium">
                    <Tooltip :label="invitation.name || '未备注'" side="top">
                      <span class="block truncate">{{
                        invitation.name || '未备注'
                      }}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip :label="invitation.code" side="top">
                      <button
                        type="button"
                        class="block max-w-full truncate text-left underline-offset-4 hover:underline"
                        @click="copyCode(invitation.code)"
                      >
                        {{ invitation.code }}
                      </button>
                    </Tooltip>
                  </TableCell>
                  <TableCell class="text-center"
                    ><Badge
                      :variant="
                        invitation.usedAt === null ? 'outline' : 'default'
                      "
                      >{{
                        invitation.usedAt === null ? '未使用' : '已使用'
                      }}</Badge
                    ></TableCell
                  >
                  <TableCell class="pr-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child
                        ><Button
                          variant="ghost"
                          size="icon-sm"
                          :disabled="deleting"
                          @focus="handleActionFocus"
                          ><MoreHorizontal /></Button
                      ></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" class="w-48"
                        ><DropdownMenuItem
                          variant="destructive"
                          @select="handleDelete(invitation)"
                          ><Trash2 />删除邀请码</DropdownMenuItem
                        ></DropdownMenuContent
                      >
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </div>
        <AdminPagination
          v-model:page="page"
          :total="total"
          :disabled="status === 'loading'"
        />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';
import {
  Link,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Badge } from '@ym-video/ui/components/badge';
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from '@ym-video/ui/components/input-group';
import CommonEmpty from '@ym-video/ui/common/empty.vue';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ym-video/ui/components/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@ym-video/ui/components/dropdown-menu';
import AdminPagination from '@/components/admin-pagination.vue';
import { useAdminList } from '@/composables/use-admin-list';
import {
  accountRequest,
  getInvitations,
} from '@/services/admin';
import type { Invitation } from '@/services/admin';
import { successToast } from '@ym-video/ui/lib/toast';
import { eventBus } from '@/utils/event-bus';
import Tooltip from '@ym-video/ui/common/tooltip.vue';

// 空列表和无匹配结果都提供恢复入口。
const { page, search, items, total, status, loaded, error, empty, refresh } =
  useAdminList(getInvitations);

// 删除失败保留目标，允许再次提交。
const deleting = ref(false);

// 根弹窗保存邀请后刷新当前分页。
onScopeDispose(eventBus.on('invitations:changed', refresh));

// 保存原行按钮用于取消后的焦点恢复。
let actionTrigger: HTMLElement | null = null;

// 记录鼠标和键盘访问的菜单入口。
const handleActionFocus = (event: FocusEvent) => {
  if (event.currentTarget instanceof HTMLElement) {
    actionTrigger = event.currentTarget;
  }
};

// 原行消失时回搜索框，列表变空时回 Empty 的新增按钮。
const getDeleteFocus = () => {
  if (actionTrigger?.isConnected && !actionTrigger.matches(':disabled')) {
    return actionTrigger;
  }
  return (
    document.getElementById('invitations-search') ??
    document.getElementById('invitations-create')
  );
};

// 点击邀请码即可复制，方便直接发给注册用户。
const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);
    successToast('邀请码已复制');
  } catch {
    successToast('请手动复制邀请码');
  }
};

// 删除已使用邀请不影响对应的注册账号。
const handleDelete = (invitation: Invitation) => {
  eventBus.emit('confirm:show', {
    title: '删除邀请码？',
    description: '删除后此邀请码将无法用于注册，已创建的账号不受影响。',
    confirmText: '删除邀请码',
    pendingText: '正在删除…',
    returnFocus: getDeleteFocus,
    onConfirm: async (signal) => {
      deleting.value = true;

      try {
        await accountRequest(
          `/admin/invitations/${encodeURIComponent(invitation.id)}`,
          { method: 'DELETE', signal },
        );
        signal.throwIfAborted();
        successToast('邀请码已删除');
        await refresh();
      } finally {
        deleting.value = false;
      }
    },
  });
};
</script>
