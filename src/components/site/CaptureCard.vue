<script setup lang="ts">
import { computed } from "vue"
import { Clock, Expand, ImageOff, LoaderCircle, RotateCcw } from "@lucide/vue"
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
  <Card class="group gap-0 overflow-hidden py-0 transition-shadow hover:shadow-lg hover:shadow-pine/10">
    <!-- thumbnail -->
    <div class="relative aspect-[16/10] overflow-hidden border-b bg-muted">
      <template v-if="capture.status === 'completed'">
        <img
          :src="capturePreview(capture)"
          :alt="`Screenshot of ${host}`"
          loading="lazy"
          class="size-full cursor-zoom-in object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
          @click="emit('view', capture)"
        >
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
        <p class="flex items-center gap-1.5 truncate font-semibold">
          <img
            v-if="capture.website?.favicon"
            :src="capture.website.favicon"
            alt=""
            class="size-4 shrink-0 rounded-sm"
            loading="lazy"
          >
          {{ host }}
        </p>
        <p class="truncate text-xs text-muted-foreground">{{ capture.url }}</p>
        <p class="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock class="size-3.5" />
          {{ timeAgo(capture.requested_at) }}
          <template v-if="capture.status === 'completed'"> · {{ fileSize }}</template>
        </p>
      </div>

      <Button
        v-if="capture.status === 'completed'"
        variant="outline"
        size="icon-sm"
        aria-label="View screenshot"
        @click="emit('view', capture)"
      >
        <Expand class="size-4" />
      </Button>
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
