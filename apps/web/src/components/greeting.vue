<template>
  <h1 :class="className">
    <template v-if="prefix">{{ prefix }}，</template>{{ greeting
    }}<template v-if="name">，{{ name }}</template
    ><span v-if="emoji" class="ml-2">{{ emoji }}</span>
  </h1>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useNow } from '@vueuse/core';
import { getGreeting } from '../lib/greeting.ts';

// 根据当前时间显示问候，页面决定称呼和前缀。
const props = withDefaults(
  defineProps<{
    name?: string;
    prefix?: string;
    emoji?: string;
    class?: string;
  }>(),
  { name: '亲爱的用户', prefix: '', emoji: '😊' },
);

const className = computed(() => props.class);
const now = useNow({ interval: 60_000 });
const greeting = computed(() => getGreeting(now.value));
</script>
