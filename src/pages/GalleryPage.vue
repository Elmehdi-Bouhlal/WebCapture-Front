<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { Camera, CircleX, Globe, ImageOff, Images, LayoutGrid, Layers, Search, Sparkles, Table2 } from "@lucide/vue"
import CaptureCard from "@/components/site/CaptureCard.vue"
import CaptureTable from "@/components/site/CaptureTable.vue"
import ScreenshotLightbox from "@/components/site/ScreenshotLightbox.vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ApiError,
  type CaptureRequest,
  type CaptureStatus,
  demoMode,
  hostOf,
  listCaptures,
  requestCapture,
} from "@/lib/api"

type Filter = "all" | CaptureStatus
type ViewMode = "grid" | "table"

const VIEW_KEY = "webcapture-gallery-view"

const captures = ref<CaptureRequest[]>([])
const loading = ref(true)
const query = ref("")
const filter = ref<Filter>("all")
const viewing = ref<CaptureRequest | null>(null)
const actionError = ref("")
const viewMode = ref<ViewMode>(
  localStorage.getItem(VIEW_KEY) === "table" ? "table" : "grid",
)

watch(viewMode, mode => localStorage.setItem(VIEW_KEY, mode))

const filters: { value: Filter, label: string }[] = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "processing", label: "In progress" },
  { value: "failed", label: "Failed" },
]

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return captures.value.filter((capture) => {
    if (filter.value === "processing") {
      if (capture.status !== "processing" && capture.status !== "pending") return false
    }
    else if (filter.value !== "all" && capture.status !== filter.value) {
      return false
    }
    if (!q) return true
    return capture.url.toLowerCase().includes(q) || hostOf(capture.url).toLowerCase().includes(q)
  })
})

const counts = computed(() => ({
  all: captures.value.length,
  completed: captures.value.filter(c => c.status === "completed").length,
  processing: captures.value.filter(c => c.status === "processing" || c.status === "pending").length,
  failed: captures.value.filter(c => c.status === "failed").length,
}))

const stats = computed(() => {
  const sites = new Set(captures.value.map(c => c.website?.name ?? hostOf(c.url)))
  const sections = captures.value.reduce((sum, c) => sum + (c.screenshots?.length ?? 0), 0)
  return [
    { icon: Globe, value: sites.size, label: sites.size === 1 ? "website" : "websites" },
    { icon: Layers, value: captures.value.length, label: captures.value.length === 1 ? "page captured" : "pages captured" },
    { icon: Images, value: sections, label: sections === 1 ? "screenshot" : "screenshots" },
  ]
})

let refreshTimer: number | undefined

async function load(showSpinner = false) {
  if (showSpinner) loading.value = true
  try {
    captures.value = await listCaptures()
  }
  finally {
    loading.value = false
  }
  // keep polling while something is still in flight (demo captures
  // complete in the background via localStorage)
  const busy = captures.value.some(c => c.status === "pending" || c.status === "processing")
  window.clearTimeout(refreshTimer)
  if (busy) refreshTimer = window.setTimeout(() => load(), 3000)
}

async function retryCapture(capture: CaptureRequest) {
  actionError.value = ""
  try {
    await requestCapture(capture.url, true)
    await load()
  }
  catch (error) {
    actionError.value = error instanceof ApiError
      ? error.message
      : "Retry failed — please try again."
  }
}

onMounted(() => load(true))
onBeforeUnmount(() => window.clearTimeout(refreshTimer))
</script>

<template>
  <!-- header -->
  <section class="border-b border-border bg-card/60">
    <div class="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <p v-reveal class="font-heading text-sm uppercase tracking-[0.2em] text-fern">The archive</p>
      <h1 v-reveal="60" class="mt-2 font-heading text-5xl uppercase tracking-tight sm:text-6xl">Capture gallery</h1>
      <p v-reveal="120" class="mt-4 max-w-xl text-muted-foreground">
        Every page that went through the lens. Search by URL — if it's already here,
        you don't need to spend a capture on it.
      </p>

      <div v-if="!loading && captures.length" v-reveal="160" class="mt-6 flex flex-wrap gap-x-8 gap-y-3">
        <div v-for="stat in stats" :key="stat.label" class="flex items-center gap-2.5">
          <span class="flex size-9 items-center justify-center rounded-lg bg-secondary text-pine dark:text-sage">
            <component :is="stat.icon" class="size-4.5" />
          </span>
          <span>
            <span class="block font-heading text-2xl leading-none tabular-nums">{{ stat.value }}</span>
            <span class="block text-xs text-muted-foreground">{{ stat.label }}</span>
          </span>
        </div>
      </div>

      <div class="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div class="relative flex-1 sm:max-w-md">
          <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="query"
            type="search"
            placeholder="Search by URL or domain…"
            class="h-11 bg-card pl-9"
            aria-label="Search captures"
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="f in filters"
            :key="f.value"
            :variant="filter === f.value ? 'default' : 'outline'"
            size="sm"
            class="rounded-full"
            @click="filter = f.value"
          >
            {{ f.label }}
            <span class="rounded-full bg-black/10 px-1.5 text-xs tabular-nums dark:bg-white/10">
              {{ counts[f.value as keyof typeof counts] }}
            </span>
          </Button>
        </div>

        <div class="flex rounded-lg border bg-card p-0.5 sm:ml-auto" role="group" aria-label="View mode">
          <Button
            :variant="viewMode === 'grid' ? 'secondary' : 'ghost'"
            size="icon-sm"
            aria-label="Grid view"
            @click="viewMode = 'grid'"
          >
            <LayoutGrid class="size-4" />
          </Button>
          <Button
            :variant="viewMode === 'table' ? 'secondary' : 'ghost'"
            size="icon-sm"
            aria-label="Table view"
            @click="viewMode = 'table'"
          >
            <Table2 class="size-4" />
          </Button>
        </div>
      </div>

      <p v-if="demoMode" class="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles class="size-3.5 text-fern" />
        Demo mode — the backend is offline, so you're browsing sample data plus your own simulated captures.
      </p>
    </div>
  </section>

  <!-- grid -->
  <section class="py-12">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div
        v-if="actionError"
        class="mb-6 flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3"
      >
        <CircleX class="size-5 shrink-0 text-destructive" />
        <p class="flex-1 text-sm text-destructive">{{ actionError }}</p>
        <Button variant="ghost" size="sm" @click="actionError = ''">Dismiss</Button>
      </div>

      <template v-if="loading">
        <div v-if="viewMode === 'grid'" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton v-for="i in 6" :key="i" class="aspect-[16/12] rounded-xl" />
        </div>
        <div v-else class="space-y-2">
          <Skeleton v-for="i in 5" :key="i" class="h-14 rounded-lg" />
        </div>
      </template>

      <div v-else-if="filtered.length && viewMode === 'grid'" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <CaptureCard
          v-for="capture in filtered"
          :key="capture.id"
          :capture="capture"
          @view="viewing = $event"
          @retry="retryCapture"
        />
      </div>

      <CaptureTable
        v-else-if="filtered.length"
        :captures="filtered"
        @view="viewing = $event"
        @retry="retryCapture"
      />

      <div v-else class="flex flex-col items-center gap-4 py-24 text-center">
        <div class="flex size-14 items-center justify-center rounded-2xl bg-secondary text-pine dark:text-sage">
          <ImageOff class="size-6" />
        </div>
        <div>
          <p class="font-heading text-2xl uppercase tracking-tight">Nothing here yet</p>
          <p class="mt-1 max-w-sm text-sm text-muted-foreground">
            No captures match your search. Point the lens at a new page and it'll show up here.
          </p>
        </div>
        <Button as-child>
          <RouterLink to="/#capture"><Camera class="size-4" /> Capture a page</RouterLink>
        </Button>
      </div>
    </div>
  </section>

  <ScreenshotLightbox :capture="viewing" @close="viewing = null" />
</template>
