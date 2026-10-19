<template>
  <footer class="flex items-center justify-between gap-4 pt-4 text-sm">
    <p class="shrink-0 text-muted-foreground">共 {{ total }} 条 · 每页 20 条</p>
    <Pagination
      v-slot="{ page: current }"
      v-model:page="page"
      :total="total"
      :items-per-page="20"
      :sibling-count="1"
      show-edges
      class="mx-0 w-auto"
      :disabled="disabled"
      aria-label="列表分页"
    >
      <PaginationContent v-slot="{ items }">
        <PaginationPrevious aria-label="上一页"
          ><ChevronLeft /><span>上一页</span></PaginationPrevious
        >
        <template v-for="(item, index) in items" :key="index">
          <PaginationItem
            v-if="item.type === 'page'"
            :value="item.value"
            :is-active="item.value === current"
            >{{ item.value }}</PaginationItem
          >
          <PaginationEllipsis v-else :index="index" />
        </template>
        <PaginationNext aria-label="下一页"
          ><span>下一页</span><ChevronRight
        /></PaginationNext>
      </PaginationContent>
    </Pagination>
  </footer>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationEllipsis,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';

// 两个管理列表共用固定每页数量和页码交互。
defineProps<{ total: number; disabled?: boolean }>();
const page = defineModel<number>('page', { required: true });
</script>
