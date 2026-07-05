import { ref } from "vue"

/**
 * API client for the WebCapture backend (Express, /api/v1/webcapture).
 *
 * Endpoints used:
 *   POST /webcapture/analyze          — queue a capture ({ url, retry? })
 *   GET  /webcapture/status/:id       — poll one capture (no screenshots included)
 *   GET  /webcapture/screenshots      — paginated list with website + screenshot URLs
 *
 * NOTE: /screenshots is called without ?page/&limit for now — the backend's
 * paginationSchema uses z.number() and query params arrive as strings, so any
 * explicit params fail validation with a 400. Switch the schema to
 * z.coerce.number().optional() server-side to enable real pagination here.
 *
 * When the backend is unreachable (network error or 502/503/504 from the
 * proxy), every call transparently falls back to a local demo store so the
 * UI stays fully testable.
 */

export type CaptureStatus = "pending" | "processing" | "completed" | "failed"

export interface Screenshot {
  /** Absolute URL of the stored image (BASE_URL_SCREENSHOTS + r2_object_key). */
  image?: string
  file_size_bytes: number | null
  captured_at: string
}

export interface WebsiteInfo {
  name: string
  favicon: string | null
  link: string
}

export interface CaptureRequest {
  id: string
  url: string
  status: CaptureStatus
  error_message?: string | null
  requested_at: string
  completed_at: string | null
  website?: WebsiteInfo | null
  screenshots?: Screenshot[]
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1"

/** True whenever a request had to fall back to the local demo simulation. */
export const demoMode = ref(false)

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(body?.message ?? `Request failed (${res.status})`, res.status)
  }
  return body.data as T
}

/**
 * A network failure OR a gateway error (502/503/504 from the Vite proxy /
 * a reverse proxy) both mean "backend unreachable" — fall back to demo mode.
 */
function backendOffline(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true
  return [502, 503, 504].includes(error.status)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function requestCapture(url: string, retry = false): Promise<CaptureRequest> {
  try {
    const capture = await request<CaptureRequest>("/webcapture/analyze", {
      method: "POST",
      body: JSON.stringify({ url, retry }),
    })
    demoMode.value = false
    return capture
  }
  catch (error) {
    if (!backendOffline(error)) throw error
    // Backend offline — simulate the capture locally.
    demoMode.value = true
    return demoCapture(url)
  }
}

export async function getCaptureStatus(id: string): Promise<CaptureRequest> {
  try {
    return await request<CaptureRequest>(`/webcapture/status/${id}`)
  }
  catch (error) {
    // 404 also hits the local store: captures created in demo mode keep
    // working after the backend comes back online.
    if (error instanceof ApiError && error.status !== 404 && !backendOffline(error)) throw error
    const local = demoStore().find(c => c.id === id)
    if (!local) throw new ApiError("Capture not found", 404)
    return local
  }
}

export async function listCaptures(): Promise<CaptureRequest[]> {
  try {
    const captures = await request<CaptureRequest[]>("/webcapture/screenshots")
    demoMode.value = false
    return captures
  }
  catch (error) {
    if (!backendOffline(error)) throw error
    demoMode.value = true
    return [...demoStore()].sort(
      (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime(),
    )
  }
}

/**
 * The status endpoint returns the capture row without its screenshots, so
 * after completion we look the capture up in the list to get image URLs.
 */
export async function getCaptureWithScreenshots(id: string): Promise<CaptureRequest | null> {
  const all = await listCaptures()
  return all.find(c => c.id === id) ?? null
}

/**
 * Full detail for one capture: screenshots come from the list endpoint,
 * error_message (absent there) from the status endpoint. Returns null when
 * the capture doesn't exist anywhere.
 */
export async function getCaptureDetail(id: string): Promise<CaptureRequest | null> {
  const [fromList, fromStatus] = await Promise.all([
    getCaptureWithScreenshots(id).catch(() => null),
    getCaptureStatus(id).catch(() => null),
  ])
  if (!fromList && !fromStatus) return null
  return { ...fromStatus, ...fromList, ...(fromStatus?.error_message !== undefined
    ? { error_message: fromStatus.error_message }
    : {}) } as CaptureRequest
}

/** First screenshot of a capture, or a generated wireframe placeholder. */
export function capturePreview(capture: CaptureRequest): string {
  const shot = capture.screenshots?.[0]
  if (shot?.image) return shot.image
  return wireframeThumb(capture.url)
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  }
  catch {
    return url
  }
}

// ---------------------------------------------------------------------------
// Demo simulation (used only while the backend is offline)
// ---------------------------------------------------------------------------

const DEMO_KEY = "webcapture-demo-captures"

function demoStore(): CaptureRequest[] {
  const raw = localStorage.getItem(DEMO_KEY)
  const own: CaptureRequest[] = raw ? JSON.parse(raw) : []
  return [...own, ...seedCaptures()]
}

function saveDemo(captures: CaptureRequest[]) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(captures))
}

function ownDemo(): CaptureRequest[] {
  const raw = localStorage.getItem(DEMO_KEY)
  return raw ? JSON.parse(raw) : []
}

function demoCapture(url: string): CaptureRequest {
  const existing = demoStore().find(c => c.url === url)
  if (existing) {
    if (existing.status === "pending" || existing.status === "processing")
      throw new ApiError("This URL is already being processed", 409)
    if (existing.status === "completed") return existing
  }

  const capture: CaptureRequest = {
    id: crypto.randomUUID(),
    url,
    status: "pending",
    error_message: null,
    requested_at: new Date().toISOString(),
    completed_at: null,
    screenshots: [],
  }
  saveDemo([capture, ...ownDemo()])

  const update = (patch: Partial<CaptureRequest>) => {
    const all = ownDemo()
    const target = all.find(c => c.id === capture.id)
    if (target) {
      Object.assign(target, patch)
      saveDemo(all)
    }
  }

  setTimeout(() => update({ status: "processing" }), 2200)
  setTimeout(() => {
    update({
      status: "completed",
      completed_at: new Date().toISOString(),
      screenshots: [{
        file_size_bytes: 240_000 + Math.floor(Math.random() * 600_000),
        captured_at: new Date().toISOString(),
      }],
    })
  }, 6500)

  return capture
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString()
}

function seedCaptures(): CaptureRequest[] {
  const done = (url: string, h: number, sizeKb: number): CaptureRequest => ({
    id: `seed-${hostOf(url)}`,
    url,
    status: "completed",
    error_message: null,
    requested_at: hoursAgo(h),
    completed_at: hoursAgo(h - 0.02),
    screenshots: [{
      file_size_bytes: sizeKb * 1024,
      captured_at: hoursAgo(h - 0.02),
    }],
  })

  return [
    done("https://stripe.com", 2, 842),
    done("https://linear.app", 5, 512),
    done("https://vercel.com", 9, 634),
    done("https://github.com", 14, 951),
    done("https://tailwindcss.com", 20, 488),
    done("https://www.figma.com", 27, 730),
    {
      id: "seed-processing",
      url: "https://openai.com",
      status: "processing",
      error_message: null,
      requested_at: hoursAgo(0.05),
      completed_at: null,
      screenshots: [],
    },
    {
      id: "seed-failed",
      url: "https://my-old-broken-site.io",
      status: "failed",
      error_message: "website url is not reachable",
      requested_at: hoursAgo(31),
      completed_at: null,
      screenshots: [],
    },
  ]
}

// ---------------------------------------------------------------------------
// Wireframe placeholder thumbnails (SVG data URI, brand palette)
// ---------------------------------------------------------------------------

const PALETTES = [
  { bg: "#f6f8f1", header: "#2b5748", hero: "#9cb080", block: "#e6ecd9", text: "#c7d3b2" },
  { bg: "#273338", header: "#1e272b", hero: "#618764", block: "#2b5748", text: "#3d5157" },
  { bg: "#ffffff", header: "#273338", hero: "#618764", block: "#ecf0e2", text: "#d5dec2" },
  { bg: "#eef2e5", header: "#618764", hero: "#2b5748", block: "#dce4cd", text: "#c1cfa6" },
]

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function wireframeThumb(url: string): string {
  const host = hostOf(url)
  const p = PALETTES[hashCode(host) % PALETTES.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300">
  <rect width="480" height="300" fill="${p.bg}"/>
  <rect width="480" height="34" fill="${p.header}"/>
  <circle cx="20" cy="17" r="6" fill="${p.hero}"/>
  <rect x="36" y="12" width="70" height="10" rx="5" fill="${p.hero}" opacity="0.85"/>
  <rect x="330" y="10" width="60" height="14" rx="7" fill="${p.hero}"/>
  <rect x="400" y="10" width="60" height="14" rx="7" fill="${p.hero}" opacity="0.55"/>
  <rect x="30" y="66" width="220" height="22" rx="6" fill="${p.hero}"/>
  <rect x="30" y="98" width="170" height="12" rx="6" fill="${p.text}"/>
  <rect x="30" y="118" width="190" height="12" rx="6" fill="${p.text}"/>
  <rect x="30" y="150" width="90" height="26" rx="13" fill="${p.header}"/>
  <rect x="280" y="60" width="170" height="130" rx="10" fill="${p.block}"/>
  <rect x="298" y="78" width="134" height="70" rx="6" fill="${p.hero}" opacity="0.6"/>
  <rect x="298" y="158" width="90" height="10" rx="5" fill="${p.text}"/>
  <rect x="30" y="216" width="130" height="60" rx="10" fill="${p.block}"/>
  <rect x="175" y="216" width="130" height="60" rx="10" fill="${p.block}"/>
  <rect x="320" y="216" width="130" height="60" rx="10" fill="${p.block}"/>
  <text x="240" y="290" text-anchor="middle" font-family="monospace" font-size="11" fill="${p.header}" opacity="0.5">${host}</text>
</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
