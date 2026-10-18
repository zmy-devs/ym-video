<template>
  <SidebarMenu class="w-auto">
    <SidebarMenuItem>
      <DropdownMenu>
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
              class="size-8 flex shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground"
            >
              {{ userInitial }}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="end"
          class="w-60"
          @close-auto-focus="handleMenuCloseAutoFocus"
        >
          <DropdownMenuLabel class="font-normal">
            <div class="flex items-center gap-3 py-1 text-left text-sm">
              <span
                class="size-8 flex shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground"
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
          <DropdownMenuItem
            v-if="user"
            :disabled="signingOut"
            @select="handleSignOut"
          >
            <LogOut class="text-current" />
            <span>退出登录</span>
          </DropdownMenuItem>
          <DropdownMenuItem v-else @select="authOpen = true">
            <LogIn class="text-current" />
            <span>登录 / 注册</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
  <AuthDialog v-model:open="authOpen" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { LogIn, LogOut } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
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
import AuthDialog from './auth-dialog.vue';
import { authClient } from '@/services/auth';

// Better Auth 当前 Cookie 会话。
const session = authClient.useSession();

// 当前账号，未登录时保留访客菜单。
const user = computed(() => session.value.data?.user);

// 账号名称为空时使用邮箱，访客显示固定名称。
const userName = computed(
  () => user.value?.name.trim() || user.value?.email || '访客',
);

// 菜单顶部显示账号邮箱或访客说明。
const userEmail = computed(() => user.value?.email || '登录以使用账号');

// 头像只使用用户名的首个字符，拉丁字母转为大写。
const userInitial = computed(() =>
  Array.from(userName.value)[0].toLocaleUpperCase(),
);

// 从访客菜单打开登录弹窗。
const authOpen = ref(false);

// 打开弹窗时由弹窗接管焦点，避免菜单关闭后把焦点拉回侧栏。
const handleMenuCloseAutoFocus = (event: Event) => {
  if (authOpen.value) {
    event.preventDefault();
  }
};

// 避免重复退出请求。
const signingOut = ref(false);

// 只有服务端撤销会话成功才退出显示。
const handleSignOut = async () => {
  signingOut.value = true;
  try {
    // 本次异步操作返回结果。
    const result = await authClient.signOut();
    if (result.error) {
      throw new Error('退出失败，请重试');
    }
    toast.success('已退出登录');
  } catch {
    toast.error('退出失败，请检查网络后重试');
  } finally {
    signingOut.value = false;
  }
};
</script>
