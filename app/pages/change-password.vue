<script setup lang="ts">
definePageMeta({ layout: false })

const { novatron } = useAppConfig()
const text = novatron.messages
useHead({ title: text.changePasswordTitle })

const supabase = useSupabaseClient()
const { metadata } = useAppAccess()
const signOut = useSignOut()

const mustChange = computed(() => metadata.value.must_change_password === true)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

async function handleSubmit(): Promise<void> {
  errorMessage.value = ''

  if (newPassword.value.length < 8 || newPassword.value.length > 72) {
    errorMessage.value = text.passwordLength
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = text.passwordMismatch
    return
  }
  if (newPassword.value === currentPassword.value) {
    errorMessage.value = text.passwordSameAsCurrent
    return
  }

  isSubmitting.value = true
  try {
    await $fetch('/api/_novatron/password', {
      method: 'POST',
      body: { current_password: currentPassword.value, new_password: newPassword.value },
    })

    // Reload the token so must_change_password is cleared in the claims.
    await supabase.auth.refreshSession()
    await navigateTo('/')
  } catch (error) {
    const failure = error as { statusCode?: number; statusMessage?: string; data?: { statusMessage?: string } }
    const relayed = failure.data?.statusMessage ?? failure.statusMessage ?? ''
    if (failure.statusCode === 429) {
      errorMessage.value = text.passwordRateLimited
    } else if (failure.statusCode === 400 && /incorrect/i.test(relayed)) {
      errorMessage.value = text.currentPasswordWrong
    } else {
      errorMessage.value = text.passwordChangeFailed
    }
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
        <h1>{{ text.changePasswordTitle }}</h1>
        <p>{{ mustChange ? text.changePasswordRequiredSubtitle : text.changePasswordSubtitle }}</p>
      </header>

      <form class="login-form" @submit.prevent="handleSubmit">
        <label class="field-group">
          <span class="field-label">{{ mustChange ? text.temporaryPasswordLabel : text.currentPasswordLabel }}</span>
          <input
            v-model="currentPassword"
            type="password"
            class="nv-input nvk-input"
            autocomplete="current-password"
            required
          >
        </label>

        <label class="field-group">
          <span class="field-label">{{ text.newPasswordLabel }}</span>
          <input
            v-model="newPassword"
            type="password"
            class="nv-input nvk-input"
            minlength="8"
            maxlength="72"
            autocomplete="new-password"
            required
          >
        </label>

        <label class="field-group">
          <span class="field-label">{{ text.confirmPasswordLabel }}</span>
          <input
            v-model="confirmPassword"
            type="password"
            class="nv-input nvk-input"
            minlength="8"
            maxlength="72"
            autocomplete="new-password"
            required
          >
        </label>

        <p v-if="errorMessage" class="error-box mono" role="alert">{{ errorMessage }}</p>

        <button type="submit" class="nv-btn nv-btn-primary submit-btn" :disabled="isSubmitting">
          {{ isSubmitting ? text.changePasswordSubmitting : text.changePasswordSubmit }}
        </button>
        <button type="button" class="nv-btn submit-btn" @click="signOut">
          {{ text.signOut }}
        </button>
      </form>
    </section>
  </main>
</template>
