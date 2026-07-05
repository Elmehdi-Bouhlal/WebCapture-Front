<script setup lang="ts">
import { computed } from "vue"
import { ArrowUpRight, Clock, Eye, Images, ImageOff, LoaderCircle, RotateCcw } from "@lucide/vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { type CaptureRequest, capturePreview, hostOf } from "@/lib/api"
import { formatBytes, timeAgo } from "@/lib/format"

const props = defineProps<{
  capture: CaptureRequest
}>()

const emit = defineEmits<{
  view: [capture: CaptureRequest]
  retry: [capture: CaptureRequest]
}>()

const host = computed(() => hostOf(props.capture.url))
const inFlight = computed(() => props.capture.status === "pending" || props.capture.status === "processing")
const fileSize = computed(() => formatBytes(props.capture.screenshots?.[0]?.file_size_bytes))
</script>

<template>
  <Card class="group gap-0 overflow-hidden py-0 transition-all duration-300 hover:-translate-y-0.5 hover:border-fern/40 hover:shadow-xl hover:shadow-pine/10">
    <!-- thumbnail -->
    <div class="relative aspect-[16/10] overflow-hidden border-b bg-muted">
      <template v-if="capture.status === 'completed'">
        <img
          :src="capturePreview(capture)"
          :alt="`Screenshot of ${host}`"
          loading="lazy"
          class="size-full cursor-zoom-in object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
          @click="emit('view', capture)"
        >
        <!-- hover overlay -->
        <div
          class="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-ink/70 via-transparent to-transparent pb-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden="true"
        >
          <span class="flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-xs font-semibold shadow-lg">
            <Images class="size-3.5 text-fern" />
            View {{ capture.screenshots?.length || 1 }} {{ (capture.screenshots?.length || 1) === 1 ? 'section' : 'sections' }}
          </span>
        </div>
      </template>
      <div v-else-if="inFlight" class="flex size-full flex-col items-center justify-center gap-2">
        <LoaderCircle class="size-6 animate-spin text-fern" />
        <span class="text-xs text-muted-foreground">Capturing…</span>
      </div>
      <div v-else class="flex size-full flex-col items-center justify-center gap-2">
        <ImageOff class="size-6 text-muted-foreground/60" />
        <span class="max-w-[80%] truncate text-xs text-muted-foreground">
          {{ capture.error_message ?? 'Capture failed' }}
        </span>
      </div>

      <Badge
        class="absolute right-2.5 top-2.5 capitalize"
        :class="{
          'bg-sage text-ink': capture.status === 'completed',
          'bg-ink/80 text-white': inFlight,
          'bg-destructive text-white': capture.status === 'failed',
        }"
      >
        <span v-if="inFlight" class="size-1.5 animate-pulse rounded-full bg-sage" />
        {{ capture.status }}
      </Badge>
    </div>

    <!-- meta -->
    <div class="flex items-start justify-between gap-2 p-4">
      <div class="min-w-0">
        <RouterLink
          :to="`/capture/${capture.id}`"
          class="flex items-center gap-1.5 truncate font-semibold underline-offset-4 hover:underline"
        >
          <img
            v-if="capture.website?.favicon"
            :src="capture.website.favicon"
            alt=""
            class="size-4 shrink-0 rounded-sm"
            loading="lazy"
          >
          {{ host }}
        </RouterLink>
        <p class="truncate text-xs text-muted-foreground">{{ capture.url }}</p>
        <p class="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock class="size-3.5" />
          {{ timeAgo(capture.requested_at) }}
          <template v-if="capture.status === 'completed'"> · {{ fileSize }}</template>
        </p>
      </div>

      <div v-if="capture.status === 'completed'" class="flex shrink-0 gap-1.5">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Quick preview"
          title="Quick preview"
          @click="emit('view', capture)"
        >
          <Eye class="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" as-child>
          <RouterLink :to="`/capture/${capture.id}`" aria-label="Open details" title="Open details">
            <ArrowUpRight class="size-4" />
          </RouterLink>
        </Button>
      </div>
      <Button
        v-else-if="capture.status === 'failed'"
        variant="outline"
        size="sm"
        @click="emit('retry', capture)"
      >
        <RotateCcw class="size-4" /> Retry
      </Button>
    </div>
  </Card>
</template>
