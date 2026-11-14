<template>
  <div
    class="-mx-4 mb-4 grid w-[calc(100%+2rem)] gap-2 overflow-hidden bg-background pb-3"
  >
    <div class="flex w-full min-w-0 gap-1 overflow-x-auto px-4 pb-1">
      <Button
        v-for="item in parents"
        :key="item.id"
        size="sm"
        :variant="selectedParent === item.id ? 'default' : 'outline'"
        @click="selectParent(item.id)"
      >
        {{ item.name }}
      </Button>
    </div>
    <div
      v-if="children.length"
      class="flex w-full min-w-0 gap-1 overflow-x-auto px-4 pb-1"
    >
      <Button
        v-for="item in children"
        :key="item.id"
        size="sm"
        :variant="selection.selectedId === item.id ? 'default' : 'outline'"
        @click="selectCategory(item.id)"
      >
        {{ item.name }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@ym-video/ui/components/button';
import { getCategorySelection } from '@/utils/category';
import { useLibraryStore } from '@/stores/library-store';

const route = useRoute();
const router = useRouter();
const library = useLibraryStore();

const parents = computed(() => library.parents);
const selection = computed(() =>
  getCategorySelection(library.categories, Number(route.params.id) || 0),
);
const children = computed(() => selection.value.children);
const selectedParent = computed(() => selection.value.parent?.id ?? 0);

// 选择大分类时默认进入其第一个小分类。
const selectParent = (id: number) => {
  const next = getCategorySelection(library.categories, id).selectedId;
  return router.push(`/category/${next}`);
};

// 选择小分类时让 URL 成为列表状态的唯一来源。
const selectCategory = (id: number) => router.push(`/category/${id}`);
</script>
