<script setup lang="ts">
import { ref } from "vue"
import { Aperture, Menu, X } from "@lucide/vue"
import { Button } from "@/components/ui/button"

const mobileOpen = ref(false)

const links = [
  { label: "How it works", to: "/#how" },
  { label: "Features", to: "/#features" },
  { label: "Gallery", to: "/gallery" },
]
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
    <nav class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
      <RouterLink to="/" class="flex items-center gap-2.5" @click="mobileOpen = false">
        <span class="flex size-9 items-center justify-center rounded-lg bg-pine text-primary-foreground">
          <Aperture class="size-5" />
        </span>
        <span class="font-heading text-2xl tracking-wide text-foreground">WebCapture</span>
      </RouterLink>

      <div class="hidden items-center gap-8 md:flex">
        <RouterLink
          v-for="link in links"
          :key="link.label"
          :to="link.to"
          class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {{ link.label }}
        </RouterLink>
      </div>

      <div class="hidden md:block">
        <Button as-child>
          <RouterLink to="/#capture">Capture a page</RouterLink>
        </Button>
      </div>

      <Button variant="ghost" size="icon" class="md:hidden" @click="mobileOpen = !mobileOpen">
        <X v-if="mobileOpen" class="size-5" />
        <Menu v-else class="size-5" />
        <span class="sr-only">Toggle menu</span>
      </Button>
    </nav>

    <div v-if="mobileOpen" class="border-t border-border/60 bg-background px-4 pb-4 md:hidden">
      <RouterLink
        v-for="link in links"
        :key="link.label"
        :to="link.to"
        class="block py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        @click="mobileOpen = false"
      >
        {{ link.label }}
      </RouterLink>
      <Button class="mt-2 w-full" as-child>
        <RouterLink to="/#capture" @click="mobileOpen = false">Capture a page</RouterLink>
      </Button>
    </div>
  </header>
</template>
