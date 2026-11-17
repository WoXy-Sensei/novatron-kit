const PUBLIC_ROUTES = new Set(['/login', '/unauthorized'])

export default defineNuxtRouteMiddleware((to) => {
  const { access } = useAppAccess()
  const user = useSupabaseUser()

  if (to.path === '/login' && access.value) {
    return navigateTo('/')
  }

  if (PUBLIC_ROUTES.has(to.path)) {
    return
  }

  if (!user.value) {
    return navigateTo('/login')
  }

  if (!access.value) {
    return navigateTo('/unauthorized')
  }

  if (import.meta.client) {
    sendHeartbeat(to.fullPath)
  }
})
