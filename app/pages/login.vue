<script setup lang="ts">
definePageMeta({ layout: false })

const { novatron } = useAppConfig()
const text = novatron.messages
useHead({ title: text.signInTitle })

const supabase = useSupabaseClient()
const route = useRoute()
const config = useRuntimeConfig()

const username = ref('')
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

async function handleSignIn(): Promise<void> {
  errorMessage.value = ''
  const normalized = username.value.trim().toLowerCase()

  if (!normalized || !password.value) {
    errorMessage.value = text.missingCredentials
    return
  }

  isSubmitting.value = true
  try {
    const email = normalized.includes('@') ? normalized : `${normalized}@${config.public.syntheticEmailDomain}`
    const { error } = await supabase.auth.signInWithPassword({ email, password: password.value })

    if (error) {
      errorMessage.value = /invalid login credentials/i.test(error.message) ? text.invalidCredentials : text.signInFailed
      return
    }

    await $fetch('/api/_novatron/auth-event', { method: 'POST', body: { action: 'auth.login' } }).catch(() => undefined)
    await navigateTo('/')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="login-container">
    <section class="nv-panel login-card">
      <div class="login-accent-bar" />
      <header class="login-header">
        <span class="nv-badge nv-badge-gold mono">{{ novatron.badge }}</span>
        <h1>{{ novatron.appName }}</h1>
        <p>{{ text.signInSubtitle }}</p>
      </header>

      <form class="login-form" @submit.prevent="handleSignIn">
        <label class="field-group">
          <span class="field-label">{{ text.usernameLabel }}</span>
          <input
            v-model="username"
            type="text"
            class="nv-input nvk-input mono"
            placeholder="ahmet.yilmaz"
            autocomplete="username"
            autocapitalize="off"
            autocorrect="off"
            required
          >
        </label>

        <label class="field-group">
          <span class="field-label">{{ text.passwordLabel }}</span>
          <input
            v-model="password"
            type="password"
            class="nv-input nvk-input"
            placeholder="••••••••••••"
            autocomplete="current-password"
            required
          >
        </label>

        <p v-if="route.query.password_changed && !errorMessage" class="success-box mono" role="status">{{ text.passwordChangedSignIn }}</p>
        <p v-if="errorMessage" class="error-box mono" role="alert">{{ errorMessage }}</p>

        <button type="submit" class="nv-btn nv-btn-primary submit-btn" :disabled="isSubmitting">
          {{ isSubmitting ? text.submitting : text.submit }}
        </button>
      </form>
    </section>
  </main>
</template>
