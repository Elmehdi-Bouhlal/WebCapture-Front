<script setup lang="ts">
import { CircleCheck, Globe, Layers, Monitor } from "@lucide/vue"
import exampleCapture from "@/assets/example-capture.png"
</script>

<template>
  <div class="relative mx-auto w-full max-w-lg">
    <!-- glow blobs -->
    <div class="absolute -top-10 -right-8 size-48 rounded-full bg-sage/40 blur-3xl" aria-hidden="true" />
    <div class="absolute -bottom-12 -left-10 size-56 rounded-full bg-fern/30 blur-3xl" aria-hidden="true" />

    <!-- browser window -->
    <div class="relative overflow-hidden rounded-2xl border border-ink/10 bg-card shadow-2xl shadow-pine/20">
      <!-- title bar -->
      <div class="flex items-center gap-3 bg-ink px-4 py-3">
        <div class="flex gap-1.5">
          <span class="size-2.5 rounded-full bg-white/25" />
          <span class="size-2.5 rounded-full bg-sage/60" />
          <span class="size-2.5 rounded-full bg-sage" />
        </div>
        <div class="flex flex-1 items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-xs text-white/70">
          <Globe class="size-3.5" />
          stripe.com
        </div>
      </div>

      <!-- example capture -->
      <div class="relative">
        <img
          :src="exampleCapture"
          alt="Example WebCapture screenshot of stripe.com"
          class="aspect-[16/10] w-full object-cover object-[35%_top]"
        >

        <!-- animated scan line -->
        <div class="scanline pointer-events-none absolute inset-x-0 top-0" aria-hidden="true">
          <div class="h-16 bg-gradient-to-b from-transparent to-sage/25" />
          <div class="h-0.5 bg-fern shadow-[0_0_12px_2px_rgb(97_135_100/0.8)]" />
        </div>
      </div>
    </div>

    <!-- floating chips -->
    <div class="chip absolute -right-3 top-16 flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white shadow-lg sm:-right-8">
      <Monitor class="size-3.5 text-sage" />
      1440 × 900 viewport
    </div>
    <div class="chip absolute -left-2 bottom-24 flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-lg ring-1 ring-border sm:-left-8" style="animation-delay: 1.2s">
      <Layers class="size-3.5 text-fern" />
      4 sections detected
    </div>
    <div class="chip absolute -bottom-4 right-6 flex items-center gap-1.5 rounded-full bg-pine px-3 py-1.5 text-xs font-medium text-white shadow-lg" style="animation-delay: 2.1s">
      <CircleCheck class="size-3.5 text-sage" />
      Hero captured
    </div>
  </div>
</template>

<style scoped>
.scanline {
  animation: scan 5s ease-in-out infinite;
}

@keyframes scan {
  0%, 8% {
    transform: translateY(0);
    opacity: 0;
  }
  12% {
    opacity: 1;
  }
  88% {
    opacity: 1;
  }
  92%, 100% {
    transform: translateY(300px);
    opacity: 0;
  }
}

.chip {
  animation: chip-pop 0.6s cubic-bezier(0.22, 1, 0.36, 1) both, chip-float 4s ease-in-out 0.6s infinite;
}

@keyframes chip-pop {
  from {
    transform: translateY(10px) scale(0.9);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes chip-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
</style>
