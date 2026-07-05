import type { Directive } from "vue"

/**
 * v-reveal — fades/slides an element in the first time it enters the
 * viewport. Optional value is a stagger delay in ms: `v-reveal="150"`.
 * Respects prefers-reduced-motion via the CSS classes.
 */
export const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    const delay = binding.value ?? 0
    el.classList.add("reveal-hidden")
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          window.setTimeout(() => el.classList.add("reveal-visible"), delay)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    )
    observer.observe(el)
  },
}
