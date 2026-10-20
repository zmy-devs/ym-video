<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="h-180 w-[calc(100vw-4rem)] max-h-[calc(100dvh-4rem)] flex flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-250"
      :show-close-button="false"
      @interact-outside="handleBlockClose"
      @escape-key-down="handleBlockClose"
      @close-auto-focus="handleCloseFocus"
    >
      <header
        class="h-10 flex shrink-0 items-center justify-between border-b bg-sidebar px-3"
      >
        <DialogTitle
          class="flex items-center gap-1.5 text-sm font-medium leading-none"
        >
          <Settings2 class="size-4" aria-hidden="true" />
          <span>设置</span>
        </DialogTitle>
        <DialogDescription class="sr-only">
          管理界面外观、当前账号和应用信息。
        </DialogDescription>
        <DialogClose v-if="!pending" as-child>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="关闭设置"
          >
            <X />
          </Button>
        </DialogClose>
      </header>
      <Tabs
        v-if="open"
        v-model="selected"
        orientation="vertical"
        class="min-h-0 flex-1 flex-row gap-0"
      >
        <div class="w-65 flex shrink-0 flex-col border-r px-2 py-2">
          <TabsList
            aria-label="设置分类"
            class="h-auto w-full flex-col justify-start gap-1 rounded-none bg-transparent p-0"
          >
            <TabsTrigger
              v-for="item in navigation"
              :key="item.value"
              :value="item.value"
              :disabled="!!pending"
              class="h-8 w-full flex-none justify-start gap-2 border-0 p-2 font-normal text-foreground shadow-none transition-colors hover:bg-accent/60 data-[state=active]:bg-accent/80 data-[state=active]:shadow-none dark:text-foreground dark:data-[state=active]:bg-accent/80 [&_svg]:size-4.5"
            >
              <component :is="item.icon" />
              <span>{{ item.label }}</span>
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="appearance" class="min-h-0 min-w-0">
          <ScrollArea class="h-full">
            <AppearanceSettings class="mx-auto w-[85%] py-8" />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="account" class="min-h-0 min-w-0">
          <ScrollArea class="h-full">
            <AccountSettings
              v-model:pending="pending"
              class="mx-auto w-[85%] py-8"
            />
          </ScrollArea>
        </TabsContent>
        <TabsContent v-if="isDesktop" value="update" class="min-h-0 min-w-0">
          <ScrollArea class="h-full">
            <UpdateSettings class="mx-auto w-[85%] py-8" />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="about" class="min-h-0 min-w-0">
          <ScrollArea class="h-full">
            <AboutSettings class="mx-auto w-[85%] py-8" />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import {
  CircleAlert,
  Palette,
  Settings2,
  UserRound,
  CircleArrowUp,
  X,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import AppearanceSettings from './settings/appearance-settings.vue';
import AccountSettings from './settings/account-settings.vue';
import AboutSettings from './settings/about-settings.vue';
import UpdateSettings from './settings/update-settings.vue';
import { authClient } from '@/services/auth';
import { eventBus } from '@/utils/event-bus';

// 全局只挂载一个设置弹窗，两个应用布局共用入口。
const open = ref(false);

// 每次打开默认进入外观设置。
const selected = ref('appearance');

// 账号提交期间禁止切换分类和手动关闭，切页仍可强制清理。
const pending = ref<'username' | 'password' | null>(null);

// 通过预加载桥接识别桌面客户端。
const isDesktop = Boolean(window.ipc);

// 更新入口只向桌面客户端提供。
const navigation = [
  { value: 'appearance', label: '外观', icon: Palette },
  { value: 'account', label: '账号', icon: UserRound },
  ...(isDesktop ? [{ value: 'update', label: '更新', icon: CircleArrowUp }] : []),
  { value: 'about', label: '关于', icon: CircleAlert },
];

// 会话身份变化后不保留上一个账号的草稿。
const session = authClient.useSession();

watch(
  () => session.value.data?.user.id,
  () => {
    open.value = false;
  },
  { flush: 'sync' },
);

watch(open, () => {
  selected.value = 'appearance';
  pending.value = null;
});

onScopeDispose(
  eventBus.on('settings:show', () => {
    if (session.value.data?.user) {
      open.value = true;
    }
  }),
);
onScopeDispose(
  eventBus.on('dialogs:close', () => {
    open.value = false;
  }),
);

// 请求进行中保留当前表单，避免误触丢失结果。
const handleBlockClose = (event: Event) => {
  if (pending.value) {
    event.preventDefault();
  }
};

// 关闭后回到用户信息按钮，兼容侧栏收起状态。
const handleCloseFocus = (event: Event) => {
  event.preventDefault();
  document.getElementById('account-menu-trigger')?.focus();
};
</script>
