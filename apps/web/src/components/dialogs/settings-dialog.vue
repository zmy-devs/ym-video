<template>
  <Dialog
    v-model:open="open"
    :pending="!!pending"
    :show-close-button="false"
    class="h-180 w-[calc(100vw-4rem)] max-h-[calc(100dvh-4rem)] flex flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-250"
    @close-auto-focus="handleCloseFocus"
  >
    <template #header>
      <header
        class="h-10 flex shrink-0 items-center justify-between border-b bg-sidebar pl-3 pr-1.5"
      >
        <DialogTitle
          class="flex items-center gap-1.5 text-sm font-medium leading-none"
        >
          <Settings2 class="size-4" /><span>设置</span>
        </DialogTitle>
        <DialogClose v-if="!pending" as-child>
          <Button variant="ghost" size="icon-sm" aria-label="关闭设置">
            <X class="size-4" />
          </Button>
        </DialogClose>
      </header>
    </template>
    <Tabs
      v-if="open"
      v-model="selected"
      orientation="vertical"
      class="min-h-0 flex-1 flex-row gap-0"
    >
      <div class="w-65 flex shrink-0 flex-col border-r p-2">
        <TabsList
          class="h-auto w-full flex-col justify-start gap-1 rounded-none bg-transparent p-0"
        >
          <TabsTrigger
            v-for="item in navigation"
            :key="item.value"
            :value="item.value"
            :disabled="!!pending"
            class="h-8 w-full flex-none justify-start gap-2 border-0 p-2 font-normal shadow-none transition-colors hover:bg-accent/60 data-[state=active]:bg-accent/80 data-[state=active]:shadow-none dark:data-[state=inactive]:text-foreground dark:data-[state=active]:bg-accent/80 [&_svg]:size-4.5"
          >
            <component :is="item.icon" />
            <span>{{ item.label }}</span>
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent
        v-for="item in navigation"
        :key="item.value"
        :value="item.value"
        class="min-h-0 min-w-0"
      >
        <ScrollArea class="h-full">
          <div class="mx-auto w-[85%] py-8">
            <template v-if="item.value === 'appearance'"
              ><AppearanceSettings
                v-model:mode="theme.mode"
                v-model:color="theme.color"
            /></template>
            <template v-else-if="item.value === 'account'"
              ><AccountSettings v-model:pending="pending" :client="authClient"
            /></template>
            <template v-else-if="item.value === 'update'"
              ><UpdateSettings
            /></template>
            <template v-else-if="item.value === 'about'"
              ><AboutSettings
            /></template>
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  </Dialog>
</template>

<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import {
  CircleAlert,
  Palette,
  UserRound,
  CircleArrowUp,
} from 'lucide-vue-next';
import { Button } from '@ym-video/ui/components/button';
import { Settings2, X } from 'lucide-vue-next';
import Dialog from '@ym-video/ui/common/dialog.vue';
import { DialogClose, DialogTitle } from '@ym-video/ui/components/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@ym-video/ui/components/tabs';
import { ScrollArea } from '@ym-video/ui/components/scroll-area';

import AppearanceSettings from '@ym-video/ui/common/appearance-settings.vue';
import AccountSettings from '@ym-video/ui/account/settings.vue';
import { useThemeStore } from '@/stores/theme-store';
import AboutSettings from './settings/about-settings.vue';
import UpdateSettings from './settings/update-settings.vue';
import { authClient } from '@/services/auth';
import { eventBus } from '@/utils/event-bus';

// 当前应用挂载一个设置弹窗。
const open = ref(false);

// 每次打开默认进入外观设置。
const selected = ref('appearance');

// 设置选择直接更新当前应用的外观。
const theme = useThemeStore();

// 账号提交期间禁止切换分类和手动关闭，切页仍可强制清理。
const pending = ref<'username' | 'password' | null>(null);

// 两端共用设置分类，更新任务由当前平台处理。
const navigation = [
  { value: 'appearance', label: '外观', icon: Palette },
  { value: 'account', label: '账号', icon: UserRound },
  { value: 'update', label: '更新', icon: CircleArrowUp },
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

// 关闭后回到用户信息按钮，兼容侧栏收起状态。
const handleCloseFocus = (event: Event) => {
  event.preventDefault();
  document.getElementById('account-menu-trigger')?.focus();
};
</script>
