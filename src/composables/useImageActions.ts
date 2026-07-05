import { ref } from "vue"
import JSZip from "jszip"

/**
 * Shared download / open-in-new-tab logic for capture screenshots.
 * Used by the quick-preview lightbox and the capture detail page.
 */
export function useImageActions() {
  const downloading = ref(new Set<number>())
  const downloadingAll = ref(false)
  const zipProgress = ref(0)
  const downloadError = ref("")

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

  function sectionName(baseName: string, index: number, ext: string): string {
    return `${baseName}-section-${String(index + 1).padStart(2, "0")}.${ext}`
  }

  async function downloadOne(src: string, baseName: string, index: number) {
    if (downloading.value.has(index)) return
    downloadError.value = ""
    downloading.value = new Set(downloading.value).add(index)
    try {
      const blob = await fetchBlob(src)
      saveBlob(blob, sectionName(baseName, index, extensionOf(blob)))
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

  async function downloadAll(sources: string[], baseName: string) {
    if (downloadingAll.value || !sources.length) return
    downloadError.value = ""

    // A single image doesn't need a zip.
    if (sources.length === 1) {
      await downloadOne(sources[0], baseName, 0)
      return
    }

    downloadingAll.value = true
    zipProgress.value = 0
    try {
      const zip = new JSZip()
      let failed = 0
      for (const [index, src] of sources.entries()) {
        try {
          const blob = await fetchBlob(src)
          zip.file(sectionName(baseName, index, extensionOf(blob)), blob)
        }
        catch {
          failed++
        }
        zipProgress.value = index + 1
      }
      if (failed === sources.length) {
        downloadError.value = "Couldn't download the images — please try again."
        return
      }
      const archive = await zip.generateAsync({ type: "blob" })
      saveBlob(archive, `${baseName}-screenshots.zip`)
      if (failed > 0)
        downloadError.value = `${failed} of ${sources.length} images couldn't be included.`
    }
    catch {
      downloadError.value = "Couldn't prepare the zip — please try again."
    }
    finally {
      downloadingAll.value = false
    }
  }

  /**
   * Open the raw image in a new tab. Browsers block top-level navigation to
   * data: URIs, so placeholders are converted to a blob URL first.
   */
  async function openImage(src: string) {
    if (!src.startsWith("data:")) {
      window.open(src, "_blank", "noopener")
      return
    }
    try {
      const blob = await fetchBlob(src)
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener")
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    }
    catch {
      downloadError.value = "Couldn't open this image."
    }
  }

  function resetDownloads() {
    downloading.value = new Set()
    downloadingAll.value = false
    downloadError.value = ""
  }

  return {
    downloading,
    downloadingAll,
    zipProgress,
    downloadError,
    downloadOne,
    downloadAll,
    openImage,
    resetDownloads,
  }
}
