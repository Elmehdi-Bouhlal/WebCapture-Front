<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import {
  ArrowLeft,
  Calendar,
  CircleX,
  Download,
  ExternalLink,
  Globe,
  HardDrive,
  HardDriveDownload,
  ImageOff,
  Images,
  LoaderCircle,
  RotateCcw,
  ScanLine,
} from "@lucide/vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useImageActions } from "@/composables/useImageActions"
import {
  ApiError,
  type CaptureRequest,
  getCaptureDetail,
  hostOf,
  requestCapture,
} from "@/lib/api"
import { formatBytes, timeAgo } from "@/lib/format"

const route = useRoute()
const router = useRouter()

const capture = ref<CaptureRequest | null>(null)
const loading = ref(true)
const notFound = ref(false)
const retrying = ref(false)
const actionError = ref("")

const {
  downloading,
  downloadingAll,
  zipProgress,
  downloadError,
  downloadOne,
  downloadAll,
  openImage,
} = useImageActions()

const host = computed(() => (capture.value ? hostOf(capture.value.url) : ""))
const shots = computed(() =>
  capture.value?.screenshots?.filter(s => s.image).map(s => ({
    src: s.image!,
    size: s.file_size_bytes,
  })) ?? [],
)
const totalSize = computed(() =>
  capture.value?.screenshots?.reduce((sum, s) => sum + (s.file_size_bytes ?? 0), 0) ?? 0,
)
const inFlight = computed(() =>
  capture.value?.status === "pending" || capture.value?.status === "processing",
)

let pollTimer: number | undefined

async function load() {
  const id = String(route.params.id)
  try {
    const detail = await getCaptureDetail(id)
    if (!detail) {
      notFound.value = true
      return
    }
    capture.value = detail
    notFound.value = false
    // keep refreshing while the capture is still being processed
    window.clearTimeout(pollTimer)
    if (detail.status === "pending" || detail.status === "processing")
      pollTimer = window.setTimeout(load, 3000)
  }
  finally {
    loading.value = false
  }
}

async function retry() {
  if (!capture.value || retrying.value) return
  retrying.value = true
  actionError.value = ""
  try {
    // a retry deletes the failed row and creates a new one — follow the new id
    const created = await requestCapture(capture.value.url, true)
    router.replace(`/capture/${created.id}`)
    loading.value = true
    capture.value = created
    window.clearTimeout(pollTimer)
    pollTimer = window.setTimeout(load, 2500)
    loading.value = false
  }
  catch (error) {
    actionError.value = error instanceof ApiError ? error.message : "Retry failed — please try again."
  }
  finally {
    retrying.value = false
  }
}

watch(() => route.params.id, () => {
  loading.value = true
  capture.value = null
  load()
})

onMounted(load)
onBeforeUnmount(() => window.clearTimeout(pollTimer))
</script>

<template>
  <!-- header -->
  <section class="border-b border-border bg-card/60">
    <div class="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <RouterLink
        to="/gallery"
        class="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft class="size-4" /> Back to gallery
      </RouterLink>

      <template v-if="loading">
        <Skeleton class="mt-6 h-12 w-72 rounded-lg" />
        <Skeleton class="mt-3 h-5 w-96 rounded-lg" />
      </template>

      <template v-else-if="capture">
        <div class="mt-6 flex flex-wrap items-start justify-between gap-6">
          <div class="min-w-0">
            <div class="flex items-center gap-3">
              <span class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
                <img v-if="capture.website?.favicon" :src="capture.website.favicon" alt="" class="size-6">
                <Globe v-else class="size-5 text-fern" />
              </span>
              <h1 class="truncate font-heading text-4xl uppercase tracking-tight sm:text-5xl">
                {{ capture.website?.name ?? host }}
              </h1>
              <Badge
                class="capitalize"
                :class="{
                  'bg-sage text-ink': capture.status === 'completed',
                  'bg-ink/80 text-white': inFlight,
                  'bg-destructive text-white': capture.status === 'failed',
                }"
              >
                <LoaderCircle v-if="inFlight" class="size-3 animate-spin" />
                {{ capture.status }}
              </Badge>
            </div>
            <a
              :href="capture.url"
              target="_blank"
              rel="noopener"
              class="mt-3 inline-flex max-w-full items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              <span class="truncate">{{ capture.url }}</span>
              <ExternalLink class="size-3.5 shrink-0" />
            </a>

            <div class="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span class="flex items-center gap-1.5">
                <Calendar class="size-4 text-fern" /> Captured {{ timeAgo(capture.requested_at) }}
              </span>
              <span v-if="shots.length" class="flex items-center gap-1.5">
                <Images class="size-4 text-fern" /> {{ shots.length }} {{ shots.length === 1 ? 'section' : 'sections' }}
              </span>
              <span v-if="totalSize" class="flex items-center gap-1.5">
                <HardDrive class="size-4 text-fern" /> {{ formatBytes(totalSize) }} total
              </span>
            </div>
          </div>

          <div class="flex shrink-0 flex-wrap gap-2">
            <Button
              v-if="capture.status === 'completed' && shots.length"
              :disabled="downloadingAll"
              @click="downloadAll(shots.map(s => s.src), host)"
            >
              <LoaderCircle v-if="downloadingAll" class="size-4 animate-spin" />
              <HardDriveDownload v-else class="size-4" />
              {{ downloadingAll ? `Preparing ${zipProgress}/${shots.length}…` : `Download all (${shots.length})` }}
            </Button>
            <Button
              v-if="capture.status === 'failed'"
              :disabled="retrying"
              @click="retry"
            >
              <LoaderCircle v-if="retrying" class="size-4 animate-spin" />
              <RotateCcw v-else class="size-4" />
              Retry capture
            </Button>
          </div>
        </div>
      </template>
    </div>
  </section>

  <!-- body -->
  <section class="py-10">
    <div class="mx-auto max-w-5xl px-4 sm:px-6">
      <p
        v-if="downloadError || actionError"
        class="mb-6 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        <CircleX class="size-4 shrink-0" />
        {{ downloadError || actionError }}
      </p>

      <!-- loading -->
      <div v-if="loading" class="space-y-6">
        <Skeleton v-for="i in 2" :key="i" class="aspect-[16/9] rounded-xl" />
      </div>

      <!-- not found -->
      <div v-else-if="notFound" class="flex flex-col items-center gap-4 py-24 text-center">
        <div class="flex size-14 items-center justify-center rounded-2xl bg-secondary text-pine dark:text-sage">
          <ImageOff class="size-6" />
        </div>
        <div>
          <p class="font-heading text-2xl uppercase tracking-tight">Capture not found</p>
          <p class="mt-1 max-w-sm text-sm text-muted-foreground">
            This capture doesn't exist (anymore). It may have been retried under a new id.
          </p>
        </div>
        <Button as-child>
          <RouterLink to="/gallery">Back to gallery</RouterLink>
        </Button>
      </div>

      <!-- still processing -->
      <div v-else-if="inFlight" class="flex flex-col items-center gap-4 py-24 text-center">
        <span class="flex size-14 items-center justify-center rounded-2xl bg-pine text-primary-foreground">
          <ScanLine class="size-6 animate-pulse" />
        </span>
        <div>
          <p class="font-heading text-2xl uppercase tracking-tight">Capturing {{ host }}…</p>
          <p class="mt-1 text-sm text-muted-foreground">
            The page refreshes automatically — your screenshots will appear here.
          </p>
        </div>
        <LoaderCircle class="size-5 animate-spin text-fern" />
      </div>

      <!-- failed -->
      <div v-else-if="capture?.status === 'failed'" class="flex flex-col items-center gap-4 py-24 text-center">
        <div class="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <CircleX class="size-6" />
        </div>
        <div>
          <p class="font-heading text-2xl uppercase tracking-tight">This capture failed</p>
          <p class="mt-1 max-w-sm text-sm text-muted-foreground">
            {{ capture.error_message ?? 'Something went wrong while capturing this page.' }}
          </p>
        </div>
        <Button :disabled="retrying" @click="retry">
          <LoaderCircle v-if="retrying" class="size-4 animate-spin" />
          <RotateCcw v-else class="size-4" />
          Retry capture
        </Button>
      </div>

      <!-- screenshots -->
      <div v-else class="space-y-6">
        <Card
          v-for="(shot, index) in shots"
          :key="shot.src"
          v-reveal="Math.min(index, 3) * 80"
          class="gap-0 overflow-hidden py-0"
        >
          <div class="flex items-center justify-between gap-3 border-b bg-card px-4 py-2.5">
            <p class="text-sm font-medium">
              Section {{ String(index + 1).padStart(2, '0') }}
              <span class="ml-1.5 text-xs text-muted-foreground">{{ formatBytes(shot.size) }}</span>
            </p>
            <div class="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                class="h-7 gap-1.5 px-2.5 text-xs"
                :aria-label="`Open section ${index + 1} in a new tab`"
                @click="openImage(shot.src)"
              >
                <ExternalLink class="size-3.5" /> Open
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="h-7 gap-1.5 px-2.5 text-xs"
                :disabled="downloading.has(index) || downloadingAll"
                @click="downloadOne(shot.src, host, index)"
              >
                <LoaderCircle v-if="downloading.has(index)" class="size-3.5 animate-spin" />
                <Download v-else class="size-3.5" />
                {{ downloading.has(index) ? 'Downloading…' : 'Download' }}
              </Button>
            </div>
          </div>
          <img
            :src="shot.src"
            :alt="`Screenshot of ${host} — section ${index + 1}`"
            loading="lazy"
            class="w-full bg-muted/50"
          >
        </Card>

        <div v-if="!shots.length" class="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
          <ImageOff class="size-6" />
          No stored images for this capture yet.
        </div>
      </div>
    </div>
  </section>
</template>
