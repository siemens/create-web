<!--
  ~ Copyright (c) Siemens 2026
  ~ SPDX-License-Identifier: MIT
-->
<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { IxApplicationHeader, IxAvatar, IxContent } from '@siemens/ix-vue';
import CompanyLogo from '../../shared/components/CompanyLogo.vue';
</script>

<template>
  <div class="overview">
    <IxApplicationHeader name="Siemens Industrial Experience Templates" :show-menu="false">
      <CompanyLogo />
      <IxAvatar initials="JD" aria-label="User avatar: JD" />
    </IxApplicationHeader>
    <main>
      <IxContent>
        <h1>Template overview</h1>
        <p>Explore the available Siemens Industrial Experience layouts.</p>
        <div class="layout-cards">
          <RouterLink
            to="/blank"
            class="layout-card"
            aria-labelledby="blank-title"
            aria-describedby="blank-description"
          >
            <h2 id="blank-title">Blank</h2>
            <p id="blank-description">
              An application shell with empty main content and no examples.
            </p>
          </RouterLink>
          <RouterLink
            to="/starter"
            class="layout-card"
            aria-labelledby="starter-title"
            aria-describedby="starter-description"
          >
            <h2 id="starter-title">Starter</h2>
            <p id="starter-description">An application shell with forms, charts, and grids.</p>
          </RouterLink>
        </div>
      </IxContent>
    </main>
  </div>
</template>

<style scoped src="./overview.css"></style>
