<template>
  <section class="flex flex-col gap-8">
    <div>
      <h2 class="border-b px-4 py-3 text-sm">关于</h2>
      <div class="min-h-17.5 flex items-center gap-2.5 px-4 py-3 text-sm">
        <div class="min-w-0 flex-1 space-y-1">
          <h3 class="font-medium">反馈问题</h3>
          <p class="text-muted-foreground">反馈应用存在的 bug</p>
        </div>
        <Button as-child size="sm" variant="outline">
          <a
            href="https://github.com/2514765066/ym-video/issues"
            target="_blank"
            rel="noopener noreferrer"
            >反馈</a
          >
        </Button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
</script>
