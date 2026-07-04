<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue"
import {
  ArrowRight,
  Camera,
  CircleCheck,
  CircleX,
  LoaderCircle,
  RotateCcw,
  ScanLine,
  Sparkles,
} from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ApiError,
  type CaptureRequest,
  capturePreview,
  demoMode,
  getCaptureStatus,
  getCaptureWithScreenshots,
  hostOf,
  requestCapture,
} from "@/lib/api"

type Phase = "idle" | "submitting" | "tracking" | "done" | "error"

const rawUrl = ref("")
const phase = ref<Phase>("idle")
const capture = ref<CaptureRequest | null>(null)
const errorMsg = ref("")
const canRetry = ref(false)
const alreadyCaptured = ref(false)

let pollTimer: number | undefined
let pollDeadline = 0

function normalizeUrl(value: string): string | null {
  let candidate = value.trim()
  if (!candidate) return null
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`
  try {
    const parsed = new URL(candidate)
    if (!parsed.hostname.includes(".")) return null
    return parsed.href
  }
  catch {
    return null
  }
}

function stopPolling() {
  if (pollTimer) window.clearInterval(pollTimer)
  pollTimer = undefined
}

function startPolling(id: string) {
  stopPolling()
  pollDeadline = Date.now() + 90_000
  pollTimer = window.setInterval(async () => {
    try {
      const latest = await getCaptureStatus(id)
      capture.value = latest
      if (latest.status === "completed") {
        phase.value = "done"
        stopPolling()
        loadScreenshots(id)
      }
      else if (latest.status === "failed") {
        fail(latest.error_message ?? "The capture failed. You can retry it.", true)
      }
      else if (Date.now() > pollDeadline) {
        fail("This one is taking a while — check the gallery in a minute.", false)
      }
    }
    catch {
      // transient — keep polling until the deadline
      if (Date.now() > pollDeadline)
        fail("Lost track of the capture — check the gallery in a minute.", false)
    }
  }, 2000)
}

function fail(message: string, retryable: boolean) {
  stopPolling()
  phase.value = "error"
  errorMsg.value = message
  canRetry.value = retryable
}

/** The status endpoint has no screenshots — pull them from the list. */
async function loadScreenshots(id: string) {
  try {
    const full = await getCaptureWithScreenshots(id)
    if (full && capture.value?.id === id) capture.value = full
  }
  catch {
    // preview falls back to the placeholder thumbnail
  }
}

async function submit(retry = false) {
  const url = normalizeUrl(rawUrl.value)
  if (!url) {
    fail("That doesn't look like a valid URL — try something like stripe.com", false)
    return
  }

  phase.value = "submitting"
  errorMsg.value = ""
  canRetry.value = false
  alreadyCaptured.value = false

  try {
    const created = await requestCapture(url, retry)
    capture.value = created
    if (created.status === "completed") {
      alreadyCaptured.value = true
      phase.value = "done"
      loadScreenshots(created.id)
    }
    else {
      phase.value = "tracking"
      startPolling(created.id)
    }
  }
  catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 429)
        fail("You've used your 5 free captures. Thanks for trying WebCapture!", false)
      else if (error.status === 409 && /failed/i.test(error.message))
        fail("A previous capture of this URL failed.", true)
      else
        fail(error.message, false)
    }
    else {
      fail("Something went wrong — please try again.", false)
    }
  }
}

function reset() {
  stopPolling()
  phase.value = "idle"
  capture.value = null
  rawUrl.value = ""
  errorMsg.value = ""
  alreadyCaptured.value = false
}

onBeforeUnmount(stopPolling)
</script>

<template>
  <div class="w-full">
    <form
      class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-lg shadow-pine/5 sm:flex-row sm:items-center"
      @submit.prevent="submit(false)"
    >
      <Input
        v-model="rawUrl"
        type="text"
        placeholder="Paste any URL — e.g. stripe.com"
        class="h-12 flex-1 border-0 bg-transparent text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
        :disabled="phase === 'submitting' || phase === 'tracking'"
        aria-label="Website URL"
      />
      <Button
        type="submit"
        size="lg"
        class="h-12 px-6 text-base"
        :disabled="phase === 'submitting' || phase === 'tracking'"
      >
        <LoaderCircle v-if="phase === 'submitting'" class="size-5 animate-spin" />
        <Camera v-else class="size-5" />
        Capture it
      </Button>
    </form>

    <!-- status area -->
    <div class="mt-4 min-h-14">
      <p v-if="phase === 'idle'" class="text-sm text-muted-foreground">
        5 free captures, no signup. We render the page in a real browser and screenshot every section.
      </p>

      <div
        v-else-if="phase === 'tracking' || phase === 'submitting'"
        class="flex items-center gap-4 rounded-xl border border-border bg-secondary/60 px-4 py-3"
      >
        <span class="relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-pine text-primary-foreground">
          <ScanLine class="size-5 animate-pulse" />
        </span>
        <div class="flex-1">
          <p class="text-sm font-semibold">
            {{ capture?.status === 'processing' ? 'Rendering & scanning the page…' : 'Queued — warming up the browser…' }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ capture ? hostOf(capture.url) : '' }} · this usually takes a few seconds
          </p>
        </div>
        <LoaderCircle class="size-5 animate-spin text-fern" />
      </div>

      <div
        v-else-if="phase === 'done' && capture"
        class="flex flex-col gap-4 rounded-xl border border-sage/60 bg-sage/15 p-4 sm:flex-row sm:items-center"
      >
        <img
          :src="capturePreview(capture)"
          :alt="`Screenshot of ${hostOf(capture.url)}`"
          class="h-24 w-40 shrink-0 rounded-lg border border-border object-cover object-top"
        >
        <div class="flex-1">
          <p class="flex items-center gap-2 text-sm font-semibold text-pine dark:text-sage">
            <CircleCheck class="size-4.5" />
            {{ alreadyCaptured ? 'Already in the gallery!' : 'Capture complete!' }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ hostOf(capture.url) }} — {{ alreadyCaptured ? 'this URL was captured before, so we saved you a try.' : 'your screenshots are ready to browse.' }}
          </p>
        </div>
        <div class="flex shrink-0 gap-2">
          <Button as-child size="sm">
            <RouterLink to="/gallery">View in gallery <ArrowRight class="size-4" /></RouterLink>
          </Button>
          <Button variant="ghost" size="sm" @click="reset">
            Capture another
          </Button>
        </div>
      </div>

      <div
        v-else-if="phase === 'error'"
        class="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3"
      >
        <CircleX class="size-5 shrink-0 text-destructive" />
        <p class="flex-1 text-sm text-destructive">{{ errorMsg }}</p>
        <Button v-if="canRetry" variant="outline" size="sm" @click="submit(true)">
          <RotateCcw class="size-4" /> Retry
        </Button>
        <Button v-else variant="ghost" size="sm" @click="reset">Dismiss</Button>
      </div>

      <p
        v-if="demoMode && phase !== 'idle'"
        class="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Sparkles class="size-3.5 text-fern" />
        Demo mode — the backend is offline, so this capture is simulated in your browser.
      </p>
    </div>
  </div>
</template>
