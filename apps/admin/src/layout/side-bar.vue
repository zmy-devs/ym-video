<template>
  <Sidebar title="Ym Video 管理">
    <SidebarGroup>
      <SidebarItem
        v-for="item in navigation"
        :key="item.path"
        as-child
        :active="route.path === item.path"
        :tooltip="item.label"
      >
        <RouterLink :to="item.path">
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </SidebarItem>
    </SidebarGroup>
    <template #footer>
      <AccountMenu
        :client="authClient"
        @settings="eventBus.emit('settings:show')"
      />
    </template>
    <template #content>
      <slot />
    </template>
  </Sidebar>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { Link, Users } from 'lucide-vue-next';
import Sidebar from '@ym-video/ui/common/sidebar/index.vue';
import SidebarGroup from '@ym-video/ui/common/sidebar/group.vue';
import SidebarItem from '@ym-video/ui/common/sidebar/item.vue';
import AccountMenu from '@ym-video/account/menu.vue';
import { authClient } from '@/services/auth';
import { eventBus } from '@/utils/event-bus';

// 管理应用维护自己的导航选中态。
const route = useRoute();

// 管理侧栏只展示账号与邀请入口。
const navigation = [
  { path: '/users', label: '账号管理', icon: Users },
  { path: '/invitations', label: '邀请管理', icon: Link },
];
</script>
