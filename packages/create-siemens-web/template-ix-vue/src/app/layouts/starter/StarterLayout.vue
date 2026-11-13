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
import { iconHome, iconPiechart, iconTable, iconTextDocument } from '@siemens/ix-icons/icons';
import CompanyLogo from '../../shared/components/CompanyLogo.vue';

const router = useRouter();
const route = useRoute();
</script>

<template>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <IxApplication>
    <IxApplicationHeader name="Siemens Industrial Experience Starter App">
      <CompanyLogo />
      <IxAvatar initials="JD" aria-label="User avatar: JD" />
    </IxApplicationHeader>
    <IxMenu enable-toggle-theme aria-label="Main navigation">
      <IxMenuItem
        :icon="iconHome"
        :active="route.name === 'starter-home'"
        aria-label="Get Started"
        @click.prevent="router.push({ name: 'starter-home' })"
      >
        Get Started
      </IxMenuItem>
      <IxMenuItem
        :icon="iconTextDocument"
        :active="route.name === 'starter-forms'"
        aria-label="Forms"
        @click.prevent="router.push({ name: 'starter-forms' })"
      >
        Forms
      </IxMenuItem>
      <IxMenuItem
        :icon="iconPiechart"
        :active="route.name === 'starter-charts'"
        aria-label="Charts"
        @click.prevent="router.push({ name: 'starter-charts' })"
      >
        Charts
      </IxMenuItem>
      <IxMenuItem
        :icon="iconTable"
        :active="route.name === 'starter-grids'"
        aria-label="Grids"
        @click.prevent="router.push({ name: 'starter-grids' })"
      >
        Grids
      </IxMenuItem>
    </IxMenu>
    <IxContent>
      <div id="main-content">
        <router-view />
      </div>
    </IxContent>
  </IxApplication>
</template>

<style scoped src="./starter-layout.css"></style>
