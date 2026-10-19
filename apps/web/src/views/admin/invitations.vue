<template>
  <section
    aria-labelledby="invitations-heading"
    class="mx-auto flex min-h-full max-w-6xl flex-col gap-6 p-6 lg:p-10"
  >
    <header>
      <h1 id="invitations-heading" class="text-2xl font-semibold">邀请管理</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        通过邀请链接分发账号，每条链接仅可注册一次。
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
          aria-label="搜索分享名称或邀请链接"
          placeholder="搜索名称或邀请链接…"
        />
        <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
      </InputGroup>
      <Button id="invitations-create" @click="eventBus.emit('invitation:show')"
        ><Plus />新增邀请</Button
      >
    </div>
    <Empty v-if="empty" class="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon"><Link /></EmptyMedia>
        <EmptyTitle>{{
          search ? '没有找到匹配的邀请' : '暂无邀请'
        }}</EmptyTitle>
        <EmptyDescription>{{
          search
            ? '换个关键词，或清除搜索后查看全部邀请。'
            : '创建邀请链接，邀请他人注册普通用户账号。'
        }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button v-if="search" variant="outline" @click="search = ''"
          >清除搜索</Button
        >
        <Button
          v-else
          id="invitations-create"
          @click="eventBus.emit('invitation:show')"
          ><Plus />新增邀请</Button
        >
      </EmptyContent>
    </Empty>
    <div
      v-else-if="loading && !loaded"
      class="flex min-h-80 items-center justify-center gap-2 text-muted-foreground"
    >
      <LoaderCircle class="size-4 animate-spin" />
      正在加载邀请…
    </div>
    <template v-else>
      <div>
        <div class="overflow-hidden rounded-md border" :aria-busy="loading">
          <Table class="table-fixed">
            <TableHeader class="bg-muted"
              ><TableRow
                ><TableHead class="w-48 pl-4">分享名称</TableHead
                ><TableHead>邀请链接</TableHead
                ><TableHead class="w-28 text-center">状态</TableHead
                ><TableHead class="w-20 pr-4 text-right"
                  >操作</TableHead
                ></TableRow
              ></TableHeader
            >
            <TableBody>
              <TableRow v-if="loading"
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
                  ><p role="alert" class="text-destructive">{{ error }}</p>
                  <Button variant="link" @click="refresh"
                    >重试</Button
                  ></TableCell
                ></TableRow
              >
              <template v-else>
                <TableRow v-for="invitation in items" :key="invitation.id">
                  <TableCell class="pl-4 font-medium">
                    <span
                      class="block truncate"
                      :title="invitation.name || '未备注'"
                      >{{ invitation.name || '未备注' }}</span
                    >
                  </TableCell>
                  <TableCell
                    ><a
                      :href="invitationUrl(invitation.token)"
                      :title="invitationUrl(invitation.token)"
                      target="_blank"
                      rel="noopener"
                      class="block truncate underline-offset-4 hover:underline"
                      >{{ invitationUrl(invitation.token) }}</a
                    ></TableCell
                  >
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
                          aria-label="邀请链接的更多操作"
                          :disabled="deleting"
                          @focus="handleActionFocus"
                          ><MoreHorizontal /></Button
                      ></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" class="w-48"
                        ><DropdownMenuItem
                          variant="destructive"
                          @select="handleDelete(invitation)"
                          ><Trash2 />删除链接</DropdownMenuItem
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
          :disabled="loading"
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from '@/components/ui/input-group';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import AdminPagination from '@/components/common/admin-pagination.vue';
import { useAdminList } from '@/composables/use-admin-list';
import {
  accountRequest,
  getInvitations,
  invitationUrl,
} from '@/services/admin';
import type { Invitation } from '@/services/admin';
import { successToast } from '@/utils/toast';
import { eventBus } from '@/utils/event-bus';

// 空列表和无匹配结果都提供恢复入口。
const { page, search, items, total, loading, loaded, error, empty, refresh } =
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

// 删除已使用邀请不影响对应的注册账号。
const handleDelete = (invitation: Invitation) => {
  eventBus.emit('confirm:show', {
    title: '删除邀请链接？',
    description: '删除后此链接将无法用于注册，已创建的账号不受影响。',
    confirmText: '删除链接',
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
        successToast('邀请链接已删除');
        await refresh();
      } finally {
        deleting.value = false;
      }
    },
  });
};
</script>
