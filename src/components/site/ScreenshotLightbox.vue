<script setup lang="ts">
import { computed, ref, watch } from "vue"
import JSZip from "jszip"
import { CircleX, Download, HardDriveDownload, LoaderCircle, X } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { type CaptureRequest, capturePreview, hostOf } from "@/lib/api"
import { formatBytes } from "@/lib/format"

const props = defineProps<{
  capture: CaptureRequest | null
}>()

const emit = defineEmits<{
  close: []
}>()

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

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

const downloading = ref<Set<number>>(new Set())
const downloadingAll = ref(false)
const zipProgress = ref(0)
const downloadError = ref("")

watch(() => props.capture, () => {
  downloading.value = new Set()
  downloadingAll.value = false
  downloadError.value = ""
})

/**
 * Same-origin fallback for the screenshot CDN: the bucket sends no CORS
 * headers, so direct fetch() is blocked — /cdn is proxied to it by Vite
 * (mirror the rule in production, or enable CORS on the bucket).
 */
function proxied(src: string): string {
  try {
    const url = new URL(src, window.location.origin)
    if (url.origin === window.location.origin || url.protocol === "data:") return src
    return `/cdn${url.pathname}${url.search}`
  }
  catch {
    return src
  }
}

async function fetchBlob(src: string): Promise<Blob> {
  const attempts = src.startsWith("data:") ? [src] : [src, proxied(src)]
  let lastError: unknown
  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.blob()
    }
    catch (error) {
      lastError = error
    }
  }
  throw lastError
}

function extensionOf(blob: Blob): string {
  if (blob.type.includes("svg")) return "svg"
  if (blob.type.includes("jpeg")) return "jpg"
  if (blob.type.includes("webp")) return "webp"
  return "png"
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function downloadOne(index: number) {
  const image = images.value[index]
  if (!image || downloading.value.has(index)) return
  downloadError.value = ""
  downloading.value = new Set(downloading.value).add(index)
  try {
    const blob = await fetchBlob(image.src)
    saveBlob(blob, `${host.value}-section-${String(index + 1).padStart(2, "0")}.${extensionOf(blob)}`)
  }
  catch {
    downloadError.value = "Couldn't download this image — please try again."
  }
  finally {
    const next = new Set(downloading.value)
    next.delete(index)
    downloading.value = next
  }
}

async function downloadAll() {
  if (downloadingAll.value || !images.value.length) return
  downloadError.value = ""

  // A single image doesn't need a zip.
  if (images.value.length === 1) {
    await downloadOne(0)
    return
  }

  downloadingAll.value = true
  zipProgress.value = 0
  try {
    const zip = new JSZip()
    let failed = 0
    for (const [index, image] of images.value.entries()) {
      try {
        const blob = await fetchBlob(image.src)
        zip.file(`${host.value}-section-${String(index + 1).padStart(2, "0")}.${extensionOf(blob)}`, blob)
      }
      catch {
        failed++
      }
      zipProgress.value = index + 1
    }
    if (failed === images.value.length) {
      downloadError.value = "Couldn't download the images — please try again."
      return
    }
    const archive = await zip.generateAsync({ type: "blob" })
    saveBlob(archive, `${host.value}-screenshots.zip`)
    if (failed > 0)
      downloadError.value = `${failed} of ${images.value.length} images couldn't be included.`
  }
  catch {
    downloadError.value = "Couldn't prepare the zip — please try again."
  }
  finally {
    downloadingAll.value = false
  }
}
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
              <Button
                size="sm"
                :disabled="downloadingAll || !images.length"
                @click="downloadAll"
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
                <Button
                  variant="outline"
                  size="sm"
                  class="h-7 gap-1.5 px-2.5 text-xs"
                  :disabled="downloading.has(index) || downloadingAll"
                  :aria-label="`Download ${img.label}`"
                  @click="downloadOne(index)"
                >
                  <LoaderCircle v-if="downloading.has(index)" class="size-3.5 animate-spin" />
                  <Download v-else class="size-3.5" />
                  {{ downloading.has(index) ? 'Downloading…' : 'Download' }}
                </Button>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
