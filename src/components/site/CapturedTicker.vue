<script setup lang="ts">
import { computed } from "vue"
import { Camera } from "@lucide/vue"

const props = defineProps<{
  domains: string[]
}>()

/** Repeat until there's enough content for a seamless loop, then double it. */
const loop = computed(() => {
  if (!props.domains.length) return []
  let items = [...new Set(props.domains)]
  while (items.length < 10) items = items.concat(items)
  return [...items, ...items]
})
</script>

<template>
  <div
    v-if="loop.length"
    class="marquee relative overflow-hidden border-y border-border/70 bg-card/50 py-3"
    aria-hidden="true"
  >
    <!-- edge fades -->
    <div class="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
    <div class="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />

    <div class="marquee-track flex w-max items-center gap-8">
      <span
        v-for="(domain, i) in loop"
        :key="`${domain}-${i}`"
        class="flex items-center gap-2.5 text-sm font-medium text-muted-foreground"
      >
        <Camera class="size-3.5 text-fern/70" />
        {{ domain }}
      </span>
    </div>
  </div>
</template>
