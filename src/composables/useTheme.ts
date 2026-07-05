import { ref } from "vue"

const THEME_KEY = "webcapture-theme"

const isDark = ref(false)

function apply(dark: boolean) {
  isDark.value = dark
  document.documentElement.classList.toggle("dark", dark)
}

export function useTheme() {
  function init() {
    const stored = localStorage.getItem(THEME_KEY)
    apply(stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches)
  }

  function toggle() {
    apply(!isDark.value)
    localStorage.setItem(THEME_KEY, isDark.value ? "dark" : "light")
  }

  return { isDark, init, toggle }
}
