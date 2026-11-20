const PUBLIC_ROUTES = new Set(['/login', '/unauthorized'])
const PASSWORD_ROUTE = '/change-password'

export default defineNuxtRouteMiddleware((to) => {
  const { access, metadata } = useAppAccess()
  const user = useSupabaseUser()
  const mustChangePassword = metadata.value.must_change_password === true

  if (to.path === '/login' && access.value && !mustChangePassword) {
    return navigateTo('/')
  }

  // A member with a temporary password is held on the change-password page until the claim clears.
  if (user.value && mustChangePassword && to.path !== PASSWORD_ROUTE && to.path !== '/login') {
    return navigateTo(PASSWORD_ROUTE)
  }

  if (PUBLIC_ROUTES.has(to.path)) {
    return
  }

  if (!user.value) {
    return navigateTo('/login')
  }

  // Changing the password only needs a signed-in user, not a role in this app.
  if (to.path === PASSWORD_ROUTE) {
    return
  }

  if (!access.value) {
    return navigateTo('/unauthorized')
  }

  if (import.meta.client) {
    sendHeartbeat(to.fullPath)
  }
})
