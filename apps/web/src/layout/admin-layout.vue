<template>
  <SidebarLayout class="h-dvh">
    <template #sidebar>
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem v-for="item in navigation" :key="item.path">
            <SidebarMenuButton
              as-child
              :is-active="route.path === item.path"
              :tooltip="item.label"
            >
              <RouterLink :to="item.path"
                ><component :is="item.icon" /><span>{{
                  item.label
                }}</span></RouterLink
              >
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </template>
    <template #sidebar-footer>
      <div
        class="flex items-center justify-between group-data-[collapsible=icon]:flex-col-reverse"
      >
        <AccountMenu />
      </div>
    </template>
    <div class="h-full overflow-auto"><RouterView /></div>
  </SidebarLayout>
</template>

<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { Link, Users } from 'lucide-vue-next';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import AccountMenu from '@/components/account-menu.vue';
import SidebarLayout from './sidebar-layout.vue';

// 后台独立导航不初始化影视资源服务。
const route = useRoute();
const navigation = [
  { path: '/admin/users', label: '账号管理', icon: Users },
  { path: '/admin/invitations', label: '邀请管理', icon: Link },
];
</script>
