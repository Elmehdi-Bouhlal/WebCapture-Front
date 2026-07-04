<script setup lang="ts">
import SiteFooter from "@/components/site/SiteFooter.vue"
import SiteNavbar from "@/components/site/SiteNavbar.vue"
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <SiteNavbar />
    <main class="flex-1">
      <RouterView />
    </main>
    <SiteFooter />
  </div>
</template>
