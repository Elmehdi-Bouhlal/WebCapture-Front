<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import {
  Aperture,
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
import CapturedTicker from "@/components/site/CapturedTicker.vue"
import HeroMockup from "@/components/site/HeroMockup.vue"
import ScreenshotLightbox from "@/components/site/ScreenshotLightbox.vue"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { type CaptureRequest, hostOf, listCaptures, requestCapture } from "@/lib/api"

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

const all = ref<CaptureRequest[]>([])
const loadingRecent = ref(true)
const viewing = ref<CaptureRequest | null>(null)

const recent = computed(() =>
  all.value.filter(c => c.status === "completed").slice(0, 3),
)
const tickerDomains = computed(() =>
  all.value.filter(c => c.status === "completed").map(c => hostOf(c.url)),
)

async function loadRecent() {
  loadingRecent.value = true
  try {
    all.value = await listCaptures()
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
    <!-- dotted texture + glows -->
    <div class="bg-dots pointer-events-none absolute inset-0 text-ink/20 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)] dark:text-sage/20" aria-hidden="true" />
    <div
      class="pointer-events-none absolute inset-0 opacity-60"
      style="background-image: radial-gradient(ellipse 60% 50% at 70% 10%, rgb(156 176 128 / 0.25), transparent), radial-gradient(ellipse 50% 40% at 10% 90%, rgb(97 135 100 / 0.18), transparent)"
      aria-hidden="true"
    />
    <div class="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28 lg:pt-24">
      <div>
        <p v-reveal class="mb-5 inline-flex items-center gap-2 rounded-full border border-fern/30 bg-secondary px-3 py-1 text-xs font-semibold text-pine dark:text-sage">
          <span class="relative flex size-2">
            <span class="absolute inline-flex size-full animate-ping rounded-full bg-fern opacity-60" />
            <span class="relative inline-flex size-2 rounded-full bg-fern" />
          </span>
          Website screenshots, section by section
        </p>
        <h1 v-reveal="80" class="font-heading text-5xl uppercase leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Capture any website.
          <span class="text-fern">Pixel</span> by
          <span class="relative inline-block text-sage">
            pixel.
            <svg class="absolute -bottom-2 left-0 w-full text-fern/70" viewBox="0 0 120 10" fill="none" preserveAspectRatio="none" aria-hidden="true">
              <path d="M2 8C25 2 65 2 118 6" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" />
            </svg>
          </span>
        </h1>
        <p v-reveal="160" class="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Paste a URL and WebCapture renders it in a real browser, clears the cookie pop-ups,
          detects every section and hands you crisp screenshots — searchable forever.
        </p>

        <div v-reveal="240" class="mt-8 max-w-xl">
          <CaptureForm />
        </div>

        <ul v-reveal="320" class="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
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

      <HeroMockup v-reveal="200" class="max-lg:hidden" />
    </div>

    <CapturedTicker :domains="tickerDomains" />
  </section>

  <!-- ============ HOW IT WORKS ============ -->
  <section id="how" class="border-b border-border bg-card/60 py-24">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <p v-reveal class="font-heading text-sm uppercase tracking-[0.2em] text-fern">How it works</p>
      <h2 v-reveal="60" class="mt-2 font-heading text-4xl uppercase tracking-tight sm:text-5xl">
        From URL to gallery in three steps
      </h2>

      <div class="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
        <div v-for="(step, i) in steps" :key="step.title" v-reveal="i * 120" class="group relative">
          <!-- connector to next step -->
          <div
            v-if="i < steps.length - 1"
            class="absolute left-full top-16 hidden w-10 border-t-2 border-dashed border-sage/70 md:block"
            aria-hidden="true"
          />
          <span class="font-heading text-6xl text-sage/50 transition-colors duration-300 group-hover:text-sage">0{{ i + 1 }}</span>
          <div class="-mt-4 flex size-11 items-center justify-center rounded-xl bg-pine text-primary-foreground shadow-md shadow-pine/25 transition-transform duration-300 group-hover:-translate-y-1">
            <component :is="step.icon" class="size-5" />
          </div>
          <h3 class="mt-4 text-lg font-bold">{{ step.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{{ step.body }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ FEATURES ============ -->
  <section id="features" class="py-24">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <p v-reveal class="font-heading text-sm uppercase tracking-[0.2em] text-fern">Features</p>
      <h2 v-reveal="60" class="mt-2 max-w-2xl font-heading text-4xl uppercase tracking-tight sm:text-5xl">
        Built like a photographer, not a scraper
      </h2>

      <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          v-for="(feature, i) in features"
          :key="feature.title"
          v-reveal="(i % 3) * 100"
          class="group gap-4 border-border/80 transition-all duration-300 hover:-translate-y-1 hover:border-fern/50 hover:shadow-xl hover:shadow-pine/10"
        >
          <CardContent class="space-y-3">
            <div class="flex size-11 items-center justify-center rounded-xl bg-secondary text-pine transition-colors duration-300 group-hover:bg-pine group-hover:text-sage dark:text-sage">
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
  <section class="border-t border-border bg-card/60 py-24">
    <div class="mx-auto max-w-6xl px-4 sm:px-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p v-reveal class="font-heading text-sm uppercase tracking-[0.2em] text-fern">Fresh from the queue</p>
          <h2 v-reveal="60" class="mt-2 font-heading text-4xl uppercase tracking-tight sm:text-5xl">Latest captures</h2>
        </div>
        <Button v-reveal="120" variant="outline" class="group" as-child>
          <RouterLink to="/gallery">
            Browse the full gallery
            <ArrowRight class="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </RouterLink>
        </Button>
      </div>

      <div class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <template v-if="loadingRecent">
          <Skeleton v-for="i in 3" :key="i" class="aspect-[16/12] rounded-xl" />
        </template>
        <template v-else>
          <div v-for="(capture, i) in recent" :key="capture.id" v-reveal="i * 100">
            <CaptureCard
              :capture="capture"
              @view="viewing = $event"
              @retry="retryCapture"
            />
          </div>
        </template>
      </div>
    </div>
  </section>

  <!-- ============ CTA ============ -->
  <section class="relative overflow-hidden bg-ink py-24 text-white">
    <!-- decorations -->
    <div class="bg-dots pointer-events-none absolute inset-0 text-sage/25 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_50%,black,transparent)]" aria-hidden="true" />
    <Aperture class="pointer-events-none absolute -right-20 -top-20 size-80 rotate-12 text-sage/10" aria-hidden="true" />
    <div class="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-fern/20 blur-3xl" aria-hidden="true" />

    <div class="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
      <h2 v-reveal class="font-heading text-4xl uppercase leading-tight tracking-tight sm:text-6xl">
        Ready to see your site<br>
        <span class="text-sage">through our lens?</span>
      </h2>
      <p v-reveal="100" class="mx-auto mt-4 max-w-md text-white/60">
        Five free captures, zero signup. Your first screenshot is fifteen seconds away.
      </p>
      <div v-reveal="200">
        <Button
          size="lg"
          class="group mt-8 h-12 bg-sage px-8 text-base font-semibold text-ink shadow-lg shadow-black/20 transition-all hover:bg-sage/90 hover:shadow-xl"
          as-child
        >
          <RouterLink to="/#capture">
            Start capturing
            <ArrowRight class="size-5 transition-transform duration-300 group-hover:translate-x-1" />
          </RouterLink>
        </Button>
      </div>
    </div>
  </section>

  <ScreenshotLightbox :capture="viewing" @close="viewing = null" />
</template>
