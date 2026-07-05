<script setup lang="ts">
import { Aperture } from "@lucide/vue"
</script>

<template>
  <footer class="relative bg-ink text-white/80">
    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sage/60 to-transparent" aria-hidden="true" />
    <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div class="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
        <div class="max-w-xs">
          <div class="flex items-center gap-2.5">
            <span class="flex size-9 items-center justify-center rounded-lg bg-sage text-ink">
              <Aperture class="size-5" />
            </span>
            <span class="font-heading text-2xl tracking-wide text-white">WebCapture</span>
          </div>
          <p class="mt-4 text-sm leading-relaxed text-white/60">
            Paste a URL, get pixel-perfect screenshots of every section of the page. Stored in the cloud, searchable forever.
          </p>
        </div>

        <div class="flex gap-16">
          <div>
            <p class="font-heading text-sm uppercase tracking-widest text-sage">Product</p>
            <ul class="mt-4 space-y-2.5 text-sm">
              <li><RouterLink to="/#how" class="underline-offset-4 transition-colors hover:text-sage hover:underline">How it works</RouterLink></li>
              <li><RouterLink to="/#features" class="underline-offset-4 transition-colors hover:text-sage hover:underline">Features</RouterLink></li>
              <li><RouterLink to="/gallery" class="underline-offset-4 transition-colors hover:text-sage hover:underline">Gallery</RouterLink></li>
            </ul>
          </div>
          <div>
            <p class="font-heading text-sm uppercase tracking-widest text-sage">Limits</p>
            <ul class="mt-4 space-y-2.5 text-sm text-white/60">
              <li>5 free captures per visitor</li>
              <li>1440 × 900 desktop viewport</li>
              <li>Public pages only</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40">
        <span>© {{ new Date().getFullYear() }} WebCapture. Point it at a page — we'll do the rest.</span>
        <span class="flex items-center gap-1.5">
          <span class="relative flex size-2">
            <span class="absolute inline-flex size-full animate-ping rounded-full bg-sage opacity-50" />
            <span class="relative inline-flex size-2 rounded-full bg-sage" />
          </span>
          Capture engine online
        </span>
      </div>
    </div>
  </footer>
</template>
