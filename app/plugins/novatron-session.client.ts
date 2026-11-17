const HEARTBEAT_INTERVAL_MS = 60_000

// Keeps HQ presence live while a member stays on one page.
export default defineNuxtPlugin(() => {
  const { access } = useAppAccess()
  const route = useRoute()

  let timer: ReturnType<typeof setInterval> | null = null

  watch(
    () => access.value?.userId,
    (userId) => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      if (userId) {
        timer = setInterval(() => {
          if (document.visibilityState === 'visible') {
            sendHeartbeat(route.fullPath)
          }
        }, HEARTBEAT_INTERVAL_MS)
      }
    },
    { immediate: true },
  )
})
