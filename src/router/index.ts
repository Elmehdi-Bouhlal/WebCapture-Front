import { createRouter, createWebHistory } from "vue-router"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/pages/HomePage.vue"),
    },
    {
      path: "/gallery",
      name: "gallery",
      component: () => import("@/pages/GalleryPage.vue"),
    },
    {
      path: "/capture/:id",
      name: "capture-detail",
      component: () => import("@/pages/CaptureDetailPage.vue"),
    },
  ],
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: "smooth", top: 80 }
    return { top: 0 }
  },
})

export default router
