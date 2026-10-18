<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="设置"
        title="设置"
        class="text-muted-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
      >
        <Settings class="size-5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent side="right" align="end" :side-offset="8" class="w-64">
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Monitor class="text-current" />
          <span>基础主题</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent class="w-44">
            <DropdownMenuRadioGroup
              :model-value="theme.mode"
              aria-label="基础主题"
              @update:model-value="theme.setMode"
            >
              <DropdownMenuRadioItem
                v-for="option in modes"
                :key="option.value"
                :value="option.value"
              >
                <template #indicator-icon>
                  <Check class="size-4" />
                </template>
                <component :is="option.icon" />
                <span>{{ option.label }}</span>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Palette class="text-current" />
          <span>主题色</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent class="w-40">
            <DropdownMenuRadioGroup
              :model-value="theme.color"
              aria-label="主题色"
              @update:model-value="theme.setColor"
            >
              <DropdownMenuRadioItem
                v-for="(option, value) in themeColors"
                :key="value"
                :value="value"
              >
                <template #indicator-icon>
                  <Check class="size-4" />
                </template>
                <span
                  class="size-4 shrink-0 rounded-full border"
                  :style="{ background: option.color }"
                />
                <span>{{ option.label }}</span>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem as-child>
        <a
          href="https://github.com/2514765066/ym-video/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Bug class="text-current" />
          <span>反馈 Bug</span>
        </a>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import {
  Bug,
  Check,
  Monitor,
  Moon,
  Palette,
  Settings,
  Sun,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { themeColors, useThemeStore } from '@/stores/theme';

// 复用全局主题与本地持久化，不为菜单维护独立偏好。
const theme = useThemeStore();

// 基础主题的名称与图标。
const modes = [
  { value: 'auto', label: '跟随系统', icon: Monitor },
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
];
</script>
