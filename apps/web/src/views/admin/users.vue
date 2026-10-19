<template>
  <section
    aria-labelledby="users-heading"
    class="mx-auto flex min-h-full max-w-6xl flex-col gap-6 p-6 lg:p-10"
  >
    <header>
      <h1 id="users-heading" class="text-2xl font-semibold">账号管理</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        创建账号，管理账号的访问权限。
      </p>
    </header>
    <div
      v-if="!empty || search"
      class="flex items-center justify-between gap-4"
    >
      <InputGroup class="w-64">
        <InputGroupInput
          id="users-search"
          v-model="search"
          aria-label="搜索用户名或邮箱"
          placeholder="搜索用户名或邮箱…"
        />
        <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
      </InputGroup>
      <Button id="users-create" @click="eventBus.emit('account:show')"
        ><Plus />新增账号</Button
      >
    </div>
    <Empty v-if="empty" class="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon"><Users /></EmptyMedia>
        <EmptyTitle>{{
          search ? '没有找到匹配的账号' : '暂无账号'
        }}</EmptyTitle>
        <EmptyDescription>{{
          search
            ? '换个关键词，或清除搜索后查看全部账号。'
            : '创建第一个账号，分配用户或管理员权限。'
        }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button v-if="search" variant="outline" @click="search = ''"
          >清除搜索</Button
        >
        <Button v-else id="users-create" @click="eventBus.emit('account:show')"
          ><Plus />新增账号</Button
        >
      </EmptyContent>
    </Empty>
    <div
      v-else-if="loading && !loaded"
      class="flex min-h-80 items-center justify-center gap-2 text-muted-foreground"
    >
      <LoaderCircle class="size-4 animate-spin" />
      正在加载账号…
    </div>
    <template v-else>
      <div>
        <div class="overflow-hidden rounded-md border" :aria-busy="loading">
          <Table>
            <TableHeader class="bg-muted">
              <TableRow>
                <TableHead class="pl-4">用户名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead class="w-28 text-center">权限</TableHead>
                <TableHead class="w-28 text-center">状态</TableHead>
                <TableHead class="w-20 pr-4 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="loading"
                ><TableCell
                  colspan="5"
                  class="h-40 text-center text-muted-foreground"
                  ><LoaderCircle
                    class="mr-2 inline size-4 animate-spin"
                  />正在加载账号…</TableCell
                ></TableRow
              >
              <TableRow v-else-if="error"
                ><TableCell colspan="5" class="h-40 text-center"
                  ><p role="alert" class="text-destructive">{{ error }}</p>
                  <Button variant="link" @click="refresh"
                    >重试</Button
                  ></TableCell
                ></TableRow
              >
              <template v-else>
                <TableRow v-for="user in items" :key="user.id">
                  <TableCell class="pl-4 font-medium">
                    {{ user.username || user.name }}
                    <span
                      v-if="user.id === currentUserId"
                      class="ml-2 text-xs font-normal text-muted-foreground"
                      >当前账号</span
                    >
                  </TableCell>
                  <TableCell>{{ user.email }}</TableCell>
                  <TableCell class="w-28 text-center">{{
                    user.role === 'admin' ? '管理员' : '用户'
                  }}</TableCell>
                  <TableCell class="text-center"
                    ><Badge :variant="user.banned ? 'outline' : 'default'">{{
                      user.banned ? '已停用' : '正常'
                    }}</Badge></TableCell
                  >
                  <TableCell class="pr-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          :aria-label="`${user.username || user.name}的更多操作`"
                          :disabled="busyId === user.id"
                          @focus="handleActionFocus"
                          ><MoreHorizontal
                        /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" class="w-48">
                        <DropdownMenuItem
                          :disabled="user.id === currentUserId"
                          @select="handleStatus(user)"
                          ><UserCheck v-if="user.banned" /><UserRoundX
                            v-else
                          />{{
                            user.banned ? '启用账号' : '停用账号'
                          }}</DropdownMenuItem
                        >
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          :disabled="user.id === currentUserId"
                          @select="handleDelete(user)"
                          ><Trash2 />删除账号</DropdownMenuItem
                        >
                      </DropdownMenuContent>
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
import { computed, onScopeDispose, ref } from 'vue';
import {
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserRoundX,
  Users,
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import AdminPagination from '@/components/common/admin-pagination.vue';
import { useAdminList } from '@/composables/use-admin-list';
import { accountRequest, getAdminUsers } from '@/services/admin';
import type { AdminUser } from '@/services/admin';
import { authClient } from '@/services/auth';
import { errorToast, successToast } from '@/utils/toast';
import { eventBus } from '@/utils/event-bus';

// 两种空结果使用同一恢复入口，已有数据按服务端分页展示。
const { page, search, items, total, loading, loaded, error, empty, refresh } =
  useAdminList(getAdminUsers);

// 当前管理员用于保护自身账号。
const session = authClient.useSession();

// 不能停用或删除当前管理员。
const currentUserId = computed(() => session.value.data?.user.id);

// 提交中的账号禁止重复操作。
const busyId = ref('');

// 记录真实按钮，在取消时恢复键盘焦点。
let actionTrigger: HTMLElement | null = null;

// 根弹窗创建成功后，当前列表再刷新。
onScopeDispose(eventBus.on('accounts:changed', refresh));

// 鼠标和键盘打开菜单都先记录对应入口。
const handleActionFocus = (event: FocusEvent) => {
  if (event.currentTarget instanceof HTMLElement) {
    actionTrigger = event.currentTarget;
  }
};

// 行被移除时回搜索框，列表变空时回 Empty 的新增按钮。
const getDeleteFocus = () => {
  if (actionTrigger?.isConnected && !actionTrigger.matches(':disabled')) {
    return actionTrigger;
  }
  return (
    document.getElementById('users-search') ??
    document.getElementById('users-create')
  );
};

// 停用与启用由服务端提交成功后再刷新表格。
const handleStatus = async (user: AdminUser) => {
  if (busyId.value) {
    return;
  }
  busyId.value = user.id;
  try {
    await accountRequest(`/admin/users/${encodeURIComponent(user.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ banned: !user.banned }),
    });
    successToast(user.banned ? '账号已启用' : '账号已停用');
    await refresh();
  } catch (cause) {
    errorToast(cause instanceof Error ? cause.message : '操作失败');
  } finally {
    busyId.value = '';
  }
};

// 删除确认交给根弹窗，列表只负责执行当前账号的操作与刷新。
const handleDelete = (user: AdminUser) => {
  eventBus.emit('confirm:show', {
    title: '删除账号？',
    description: `将永久删除 ${user.username || user.name} 的账号与关联数据，此操作无法撤销。`,
    confirmText: '删除账号',
    pendingText: '正在删除…',
    returnFocus: getDeleteFocus,
    onConfirm: async (signal) => {
      busyId.value = user.id;

      try {
        await accountRequest(`/admin/users/${encodeURIComponent(user.id)}`, {
          method: 'DELETE',
          signal,
        });
        signal.throwIfAborted();
        successToast('账号已删除');
        await refresh();
      } finally {
        busyId.value = '';
      }
    },
  });
};
</script>
