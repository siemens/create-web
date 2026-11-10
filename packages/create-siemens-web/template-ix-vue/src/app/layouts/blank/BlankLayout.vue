<!--
  ~ Copyright (c) Siemens 2026
  ~ SPDX-License-Identifier: MIT
-->
<script setup lang="ts">
import { RouterView, useRoute, useRouter } from 'vue-router';
import {
  IxApplication,
  IxApplicationHeader,
  IxAvatar,
  IxContent,
  IxMenu,
  IxMenuItem,
} from '@siemens/ix-vue';
import { iconHome } from '@siemens/ix-icons/icons';
import CompanyLogo from '../../shared/components/CompanyLogo.vue';

const router = useRouter();
const route = useRoute();
</script>

<template>
  <IxApplication>
    <IxApplicationHeader name="Siemens Industrial Experience App">
      <CompanyLogo />
      <IxAvatar initials="JD" aria-label="User avatar: JD" />
    </IxApplicationHeader>
    <IxMenu enable-toggle-theme aria-label="Main navigation">
      <IxMenuItem
        :icon="iconHome"
        :active="route.name === 'blank-home'"
        aria-label="Home"
        @click.prevent="router.push({ name: 'blank-home' })"
      >
        Home
      </IxMenuItem>
    </IxMenu>
    <IxContent>
      <RouterView />
    </IxContent>
  </IxApplication>
</template>

<style scoped src="./blank-layout.css"></style>
