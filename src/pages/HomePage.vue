<script setup lang="ts">
import { onMounted, ref } from "vue"
import {
  ArrowRight,
  CircleCheck,
  Cloud,
  Cookie,
  Images,
  LayoutTemplate,
  Link2,
  Maximize2,
  RotateCcw,
  ScanLine,
  Search,
} from "@lucide/vue"
import CaptureCard from "@/components/site/CaptureCard.vue"
import CaptureForm from "@/components/site/CaptureForm.vue"
import HeroMockup from "@/components/site/HeroMockup.vue"
import ScreenshotLightbox from "@/components/site/ScreenshotLightbox.vue"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { type CaptureRequest, listCaptures, requestCapture } from "@/lib/api"

const steps = [
  {
    icon: Link2,
    title: "Paste your link",
    body: "Drop any public URL. We ping it first, so you never burn a capture on a dead page.",
  },
  {
    icon: ScanLine,
    title: "We render & scan",
    body: "A real browser loads the page at 1440×900, dismisses cookie pop-ups, and detects every section.",
  },
  {
    icon: Images,
    title: "Browse your shots",
    body: "Full-page and per-section screenshots land in your gallery — stored in the cloud, ready to share.",
  },
]

const features = [
  {
    icon: Maximize2,
    title: "Full-page capture",
    body: "Edge-to-edge screenshots at a real desktop viewport — no cropped heroes, no mobile-emulation artifacts.",
  },
  {
    icon: LayoutTemplate,
    title: "Smart section detection",
    body: "Heroes, grids and footers are found automatically — Shopify, Webflow, WordPress, Elementor and more.",
  },
  {
    icon: Cookie,
    title: "Cookie banners? Gone.",
    body: "Consent pop-ups from OneTrust, Cookiebot and friends are dismissed before the shutter clicks.",
  },
  {
    icon: RotateCcw,
    title: "Queue with retries",
    body: "Every capture runs through a job queue with live status — and failed jobs retry in one click.",
  },
  {
    icon: Cloud,
    title: "Stored in the cloud",
    body: "Screenshots are pushed straight to object storage and available the moment they're ready.",
  },
  {
    icon: Search,
    title: "Search your history",
    body: "Already captured a URL? We'll find it instantly instead of capturing it twice.",
  },
]

const recent = ref<CaptureRequest[]>([])
const loadingRecent = ref(true)
const viewing = ref<CaptureRequest | null>(null)

async function loadRecent() {
  loadingRecent.value = true
  try {
    const all = await listCaptures()
    recent.value = all.filter(c => c.status === "completed").slice(0, 3)
  }
  finally {
    loadingRecent.value = false
  }
}

async function retryCapture(capture: CaptureRequest) {
  try {
    await requestCapture(capture.url, true)
    await loadRecent()
  }
  catch {
    // surfaced properly on the gallery page; here it's just a preview grid
  }
}

onMounted(loadRecent)
</script>

<template>
  <!-- ============ HERO ============ -->
  <section id="capture" class="relative overflow-hidden">
    <div
      class="pointer-events-none absolute inset-0 opacity-60"
      style="background-image: radial-gradient(ellipse 60% 50% at 70% 10%, rgb(156 176 128 / 0.25), transparent), radial-gradient(ellipse 50% 40% at 10% 90%, rgb(97 135 100 / 0.18), transparent)"
      aria-hidden="true"
    />
    <div class="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28 lg:pt-24">
      <div>
        <p class="mb-5 inline-flex items-center gap-2 rounded-full border border-fern/30 bg-secondary px-3 py-1 text-xs font-semibold text-pine dark:text-sage">
          <ScanLine class="size-3.5" />
          Website screenshots, section by section
        </p>
        <h1 class="font-heading text-5xl uppercase leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Capture any website.
          <span class="text-fern">Pixel</span> by
          <span class="text-sage">pixel.</span>
        </h1>
        <p class="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Paste a URL and WebCapture renders it in a real browser, clears the cookie pop-ups,
          detects every section and hands you crisp screenshots — searchable forever.
        </p>

        <div class="mt-8 max-w-xl">
          <CaptureForm />
        </div>

        <ul class="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <li class="flex items-center gap-1.5">
            <CircleCheck class="size-4 text-fern" /> No signup needed
          </li>
          <li class="flex items-center gap-1.5">
            <CircleCheck class="size-4 text-fern" /> 5 free captures
          </li>
          <li class="flex items-center gap-1.5">
            <CircleCheck class="size-4 text-fern" /> Real Chromium rendering
          </li>
        </ul>
      </div>

      <HeroMockup class="max-lg:hidden" />
    </div>
  </section>

  <!-- ============ HOW IT WORKS ============ -->
  <section id="how" class="border-y border-border bg-card/60 py-20">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <p class="font-heading text-sm uppercase tracking-[0.2em] text-fern">How it works</p>
      <h2 class="mt-2 font-heading text-4xl uppercase tracking-tight sm:text-5xl">
        From URL to gallery in three steps
      </h2>

      <div class="mt-12 grid gap-10 md:grid-cols-3">
        <div v-for="(step, i) in steps" :key="step.title" class="relative">
          <span class="font-heading text-6xl text-sage/50">0{{ i + 1 }}</span>
          <div class="-mt-4 flex size-11 items-center justify-center rounded-xl bg-pine text-primary-foreground">
            <component :is="step.icon" class="size-5" />
          </div>
          <h3 class="mt-4 text-lg font-bold">{{ step.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{{ step.body }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ FEATURES ============ -->
  <section id="features" class="py-20">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <p class="font-heading text-sm uppercase tracking-[0.2em] text-fern">Features</p>
      <h2 class="mt-2 max-w-2xl font-heading text-4xl uppercase tracking-tight sm:text-5xl">
        Built like a photographer, not a scraper
      </h2>

      <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          v-for="feature in features"
          :key="feature.title"
          class="gap-4 border-border/80 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-pine/10"
        >
          <CardContent class="space-y-3">
            <div class="flex size-11 items-center justify-center rounded-xl bg-secondary text-pine dark:text-sage">
              <component :is="feature.icon" class="size-5" />
            </div>
            <h3 class="font-bold">{{ feature.title }}</h3>
            <p class="text-sm leading-relaxed text-muted-foreground">{{ feature.body }}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  </section>

  <!-- ============ RECENT CAPTURES ============ -->
  <section class="border-t border-border bg-card/60 py-20">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="font-heading text-sm uppercase tracking-[0.2em] text-fern">Fresh from the queue</p>
          <h2 class="mt-2 font-heading text-4xl uppercase tracking-tight sm:text-5xl">Latest captures</h2>
        </div>
        <Button variant="outline" as-child>
          <RouterLink to="/gallery">Browse the full gallery <ArrowRight class="size-4" /></RouterLink>
        </Button>
      </div>

      <div class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <template v-if="loadingRecent">
          <Skeleton v-for="i in 3" :key="i" class="aspect-[16/12] rounded-xl" />
        </template>
        <template v-else>
          <CaptureCard
            v-for="capture in recent"
            :key="capture.id"
            :capture="capture"
            @view="viewing = $event"
            @retry="retryCapture"
          />
        </template>
      </div>
    </div>
  </section>

  <!-- ============ CTA ============ -->
  <section class="bg-ink py-20 text-white">
    <div class="mx-auto max-w-4xl px-4 text-center sm:px-6">
      <h2 class="font-heading text-4xl uppercase leading-tight tracking-tight sm:text-6xl">
        Ready to see your site<br>
        <span class="text-sage">through our lens?</span>
      </h2>
      <p class="mx-auto mt-4 max-w-md text-white/60">
        Five free captures, zero signup. Your first screenshot is fifteen seconds away.
      </p>
      <Button
        size="lg"
        class="mt-8 h-12 bg-sage px-8 text-base font-semibold text-ink hover:bg-sage/90"
        as-child
      >
        <RouterLink to="/#capture">Start capturing <ArrowRight class="size-5" /></RouterLink>
      </Button>
    </div>
  </section>

  <ScreenshotLightbox :capture="viewing" @close="viewing = null" />
</template>
