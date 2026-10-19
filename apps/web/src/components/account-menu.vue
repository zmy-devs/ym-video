<template>
  <SidebarMenu class="w-auto">
    <SidebarMenuItem>
      <DropdownMenu v-model:open="open">
        <DropdownMenuTrigger as-child>
          <Button
            id="account-menu-trigger"
            type="button"
            variant="ghost"
            size="icon-lg"
            :aria-label="`${userName} · 账号`"
            class="-mx-1 rounded-xl data-[state=open]:bg-accent"
          >
            <span
              class="size-8 flex shrink-0 items-center justify-center rounded-full bg-primary font-medium leading-none text-primary-foreground"
            >
              {{ userInitial }}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="end"
          class="w-60"
          @close-auto-focus="handleMenuCloseFocus"
        >
          <DropdownMenuLabel class="font-normal">
            <div class="flex items-center gap-3 py-1 text-left text-sm">
              <span
                class="size-8 flex shrink-0 items-center justify-center rounded-full bg-primary font-medium leading-none text-primary-foreground"
              >
                {{ userInitial }}
              </span>
              <div class="min-w-0 grid flex-1 gap-1 leading-tight">
                <span class="truncate font-semibold">{{ userName }}</span>
                <span class="truncate text-[13px] text-muted-foreground">{{
                  userEmail
                }}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem :disabled="signingOut" @select="handleSettings">
            <Settings2 class="text-current" />
            <span>设置</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem :disabled="signingOut" @select="handleSignOut">
            <LogOut class="text-current" />
            <span>退出登录</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { LogOut, Settings2 } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/services/auth';
import { useHistoryStore } from '@/stores/history';
import { errorToast, successToast } from '@/utils/toast';
import { eventBus } from '@/utils/event-bus';

// 打开设置时先关闭用户菜单，再让弹窗接管焦点。
const open = ref(false);

// 菜单关闭时避免抢回设置弹窗的焦点。
let openingSettings = false;

// 只有打开设置的关闭动作需要跳过默认焦点恢复。
const handleMenuCloseFocus = (event: Event) => {
  if (openingSettings) {
    event.preventDefault();
    openingSettings = false;
  }
};

// 设置入口由前台和后台共用根弹窗。
const handleSettings = () => {
  openingSettings = true;
  open.value = false;
  eventBus.emit('settings:show');
};

// Better Auth 当前 Cookie 会话。
const session = authClient.useSession();

// 退出成功后立即清除其他账号可见的历史状态。
const history = useHistoryStore();

// 当前已登录账号，由路由守卫和全局会话监听保护。
const user = computed(() => session.value.data?.user);

// 账号名称为空时使用邮箱，会话加载期间显示账号占位。
const userName = computed(
  () => user.value?.name.trim() || user.value?.email || '账号',
);

// 菜单顶部显示当前账号邮箱。
const userEmail = computed(() => user.value?.email || '');

// 头像只使用用户名的首个字符，拉丁字母转为大写。
const userInitial = computed(() =>
  Array.from(userName.value)[0].toLocaleUpperCase(),
);

// 避免重复退出请求。
const signingOut = ref(false);

// 只有服务端撤销会话成功才退出显示。
const handleSignOut = async () => {
  if (signingOut.value) {
    return;
  }

  signingOut.value = true;

  try {
    // 本次异步操作返回结果。
    const result = await authClient.signOut();

    if (result.error) {
      errorToast(result.error.message || '退出失败，请重试');

      return;
    }

    await history.setAccount(null);
    successToast('已退出登录');
  } catch {
    errorToast('退出失败，请检查网络后重试');
  } finally {
    signingOut.value = false;
  }
};
</script>
