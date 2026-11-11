<template>
  <DropdownMenuLabel class="text-xs text-muted-foreground">
    {{ custom ? '我的播放源' : '播放源' }}
  </DropdownMenuLabel>
</template>

<script setup lang="ts">
import { DropdownMenuLabel } from '@ym-video/ui/components/dropdown-menu';

// 平台源和自定义源在各端使用相同的分组名称。
defineProps<{ custom?: boolean }>();
</script>
