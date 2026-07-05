<script setup lang="ts">
import { computed, watch } from "vue"
import {
  ArrowUpRight,
  CircleX,
  Download,
  ExternalLink,
  HardDriveDownload,
  LoaderCircle,
  X,
} from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { useImageActions } from "@/composables/useImageActions"
import { type CaptureRequest, capturePreview, hostOf } from "@/lib/api"
import { formatBytes } from "@/lib/format"

const props = defineProps<{
  capture: CaptureRequest | null
}>()

const emit = defineEmits<{
  close: []
}>()

const {
  downloading,
  downloadingAll,
  zipProgress,
  downloadError,
  downloadOne,
  downloadAll,
  openImage,
  resetDownloads,
} = useImageActions()

/** All stored section screenshots; falls back to the placeholder preview. */
const images = computed(() => {
  const shots = props.capture?.screenshots?.filter(s => s.image) ?? []
  if (shots.length) {
    return shots.map((s, i) => ({
      src: s.image!,
      label: `Section ${i + 1} · ${formatBytes(s.file_size_bytes)}`,
    }))
  }
  return props.capture ? [{ src: capturePreview(props.capture), label: "Preview" }] : []
})

const host = computed(() => (props.capture ? hostOf(props.capture.url) : ""))

watch(() => props.capture, resetDownloads)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="capture"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        @click.self="emit('close')"
        @keydown.esc="emit('close')"
      >
        <div class="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl">
          <div class="flex items-center justify-between gap-4 border-b px-4 py-2.5">
            <p class="truncate text-sm font-medium">
              {{ host }}
              <span v-if="images.length > 1" class="ml-1 text-muted-foreground">· {{ images.length }} sections</span>
            </p>
            <div class="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" as-child>
                <RouterLink :to="`/capture/${capture.id}`" @click="emit('close')">
                  <ArrowUpRight class="size-4" /> Full details
                </RouterLink>
              </Button>
              <Button
                size="sm"
                :disabled="downloadingAll || !images.length"
                @click="downloadAll(images.map(i => i.src), host)"
              >
                <LoaderCircle v-if="downloadingAll" class="size-4 animate-spin" />
                <HardDriveDownload v-else class="size-4" />
                {{ downloadingAll
                  ? `Preparing ${zipProgress}/${images.length}…`
                  : images.length > 1 ? `Download all (${images.length})` : 'Download' }}
              </Button>
              <button
                class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close"
                @click="emit('close')"
              >
                <X class="size-4" />
              </button>
            </div>
          </div>

          <p
            v-if="downloadError"
            class="flex items-center gap-2 border-b bg-destructive/10 px-4 py-2 text-xs text-destructive"
          >
            <CircleX class="size-3.5 shrink-0" />
            {{ downloadError }}
          </p>

          <div class="space-y-4 overflow-auto bg-muted/50 p-4">
            <figure v-for="(img, index) in images" :key="img.src">
              <img
                :src="img.src"
                :alt="`Screenshot of ${host} — ${img.label}`"
                loading="lazy"
                class="w-full rounded-lg border shadow-sm"
              >
              <figcaption class="mt-1.5 flex items-center justify-between gap-2">
                <span class="text-xs text-muted-foreground">{{ img.label }}</span>
                <span class="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7 gap-1.5 px-2.5 text-xs"
                    :aria-label="`Open ${img.label} in a new tab`"
                    @click="openImage(img.src)"
                  >
                    <ExternalLink class="size-3.5" /> Open
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7 gap-1.5 px-2.5 text-xs"
                    :disabled="downloading.has(index) || downloadingAll"
                    :aria-label="`Download ${img.label}`"
                    @click="downloadOne(img.src, host, index)"
                  >
                    <LoaderCircle v-if="downloading.has(index)" class="size-3.5 animate-spin" />
                    <Download v-else class="size-3.5" />
                    {{ downloading.has(index) ? 'Downloading…' : 'Download' }}
                  </Button>
                </span>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
