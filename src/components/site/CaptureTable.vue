<script setup lang="ts">
import { computed, ref } from "vue"
import {
  ArrowUpRight,
  ChevronDown,
  CornerDownRight,
  Eye,
  Globe,
  LoaderCircle,
  RotateCcw,
} from "@lucide/vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type CaptureRequest, capturePreview, hostOf } from "@/lib/api"
import { formatBytes, timeAgo } from "@/lib/format"

const props = defineProps<{
  captures: CaptureRequest[]
}>()

const emit = defineEmits<{
  view: [capture: CaptureRequest]
  retry: [capture: CaptureRequest]
}>()

interface WebsiteGroup {
  key: string
  name: string
  favicon: string | null
  domain: string
  pages: CaptureRequest[]
  latest: string
  completed: number
  inFlight: number
  failed: number
}

const groups = computed<WebsiteGroup[]>(() => {
  const map = new Map<string, WebsiteGroup>()
  for (const capture of props.captures) {
    const domain = hostOf(capture.url)
    const key = capture.website?.name ?? domain
    let group = map.get(key)
    if (!group) {
      group = {
        key,
        name: capture.website?.name ?? domain,
        favicon: capture.website?.favicon ?? null,
        domain,
        pages: [],
        latest: capture.requested_at,
        completed: 0,
        inFlight: 0,
        failed: 0,
      }
      map.set(key, group)
    }
    group.pages.push(capture)
    if (capture.requested_at > group.latest) group.latest = capture.requested_at
    if (capture.status === "completed") group.completed++
    else if (capture.status === "failed") group.failed++
    else group.inFlight++
  }
  const result = [...map.values()]
  for (const group of result)
    group.pages.sort((a, b) => b.requested_at.localeCompare(a.requested_at))
  return result.sort((a, b) => b.latest.localeCompare(a.latest))
})

const expanded = ref(new Set<string>())

function toggle(key: string) {
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}

function pathOf(capture: CaptureRequest): string {
  try {
    const url = new URL(capture.url)
    return `${url.pathname}${url.search}` || "/"
  }
  catch {
    return capture.url
  }
}

function totalSize(capture: CaptureRequest): number {
  return capture.screenshots?.reduce((sum, s) => sum + (s.file_size_bytes ?? 0), 0) ?? 0
}

function isInFlight(capture: CaptureRequest): boolean {
  return capture.status === "pending" || capture.status === "processing"
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border bg-card shadow-sm">
    <Table>
      <TableHeader>
        <TableRow class="hover:bg-transparent">
          <TableHead class="pl-4">Website</TableHead>
          <TableHead>Pages</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last capture</TableHead>
          <TableHead class="pr-4 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-for="group in groups" :key="group.key">
          <!-- website row -->
          <TableRow
            class="cursor-pointer"
            :aria-expanded="expanded.has(group.key)"
            @click="toggle(group.key)"
          >
            <TableCell class="py-3 pl-4">
              <div class="flex items-center gap-2.5">
                <ChevronDown
                  class="size-4 shrink-0 text-muted-foreground transition-transform duration-200"
                  :class="expanded.has(group.key) ? '' : '-rotate-90'"
                />
                <span class="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary">
                  <img v-if="group.favicon" :src="group.favicon" alt="" class="size-4" loading="lazy">
                  <Globe v-else class="size-3.5 text-fern" />
                </span>
                <span>
                  <span class="block font-semibold capitalize">{{ group.name }}</span>
                  <span class="block text-xs text-muted-foreground">{{ group.domain }}</span>
                </span>
              </div>
            </TableCell>
            <TableCell class="tabular-nums">
              {{ group.pages.length }} {{ group.pages.length === 1 ? 'page' : 'pages' }}
            </TableCell>
            <TableCell>
              <div class="flex flex-wrap gap-1.5">
                <Badge v-if="group.completed" class="bg-sage text-ink">{{ group.completed }} completed</Badge>
                <Badge v-if="group.inFlight" variant="secondary">
                  <span class="size-1.5 animate-pulse rounded-full bg-fern" />
                  {{ group.inFlight }} in progress
                </Badge>
                <Badge v-if="group.failed" variant="destructive">{{ group.failed }} failed</Badge>
              </div>
            </TableCell>
            <TableCell class="text-muted-foreground">{{ timeAgo(group.latest) }}</TableCell>
            <TableCell class="pr-4 text-right text-xs text-muted-foreground">
              {{ expanded.has(group.key) ? 'Hide pages' : 'Show pages' }}
            </TableCell>
          </TableRow>

          <!-- page detail rows -->
          <template v-if="expanded.has(group.key)">
            <TableRow
              v-for="page in group.pages"
              :key="page.id"
              class="bg-muted/40 animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <TableCell class="py-2.5 pl-4">
                <div class="flex items-center gap-2.5 pl-6">
                  <CornerDownRight class="size-3.5 shrink-0 text-muted-foreground/60" />
                  <button
                    v-if="page.status === 'completed'"
                    class="h-9 w-14 shrink-0 cursor-zoom-in overflow-hidden rounded-md border"
                    :aria-label="`View screenshots of ${page.url}`"
                    @click.stop="emit('view', page)"
                  >
                    <img :src="capturePreview(page)" alt="" loading="lazy" class="size-full object-cover object-top">
                  </button>
                  <span class="max-w-52 truncate font-mono text-xs" :title="page.url">{{ pathOf(page) }}</span>
                </div>
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">
                <template v-if="page.status === 'completed'">
                  {{ page.screenshots?.length ?? 0 }} sections · {{ formatBytes(totalSize(page)) }}
                </template>
                <template v-else-if="page.status === 'failed'">
                  {{ page.error_message ?? 'Capture failed' }}
                </template>
                <template v-else>—</template>
              </TableCell>
              <TableCell>
                <Badge
                  class="capitalize"
                  :class="{
                    'bg-sage text-ink': page.status === 'completed',
                    'bg-ink/80 text-white': isInFlight(page),
                    'bg-destructive text-white': page.status === 'failed',
                  }"
                >
                  <LoaderCircle v-if="isInFlight(page)" class="size-3 animate-spin" />
                  {{ page.status }}
                </Badge>
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">{{ timeAgo(page.requested_at) }}</TableCell>
              <TableCell class="pr-4">
                <div class="flex justify-end gap-1.5">
                  <template v-if="page.status === 'completed'">
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-7 gap-1.5 px-2.5 text-xs"
                      @click.stop="emit('view', page)"
                    >
                      <Eye class="size-3.5" /> Preview
                    </Button>
                    <Button variant="outline" size="sm" class="h-7 gap-1.5 px-2.5 text-xs" as-child>
                      <RouterLink :to="`/capture/${page.id}`" @click.stop>
                        <ArrowUpRight class="size-3.5" /> Details
                      </RouterLink>
                    </Button>
                  </template>
                  <Button
                    v-else-if="page.status === 'failed'"
                    variant="outline"
                    size="sm"
                    class="h-7 gap-1.5 px-2.5 text-xs"
                    @click.stop="emit('retry', page)"
                  >
                    <RotateCcw class="size-3.5" /> Retry
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </template>
      </TableBody>
    </Table>
  </div>
</template>
