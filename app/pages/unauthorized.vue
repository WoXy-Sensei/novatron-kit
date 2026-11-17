<script setup lang="ts">
definePageMeta({ layout: false })

const text = useAppConfig().novatron.messages
useHead({ title: text.unauthorizedTitle })

const signOut = useSignOut()
const user = useSupabaseUser()
</script>

<template>
  <main class="login-container">
    <section class="nv-panel login-card">
      <div class="login-accent-bar" />
      <header class="login-header">
        <span class="nv-badge nv-badge-danger mono">403</span>
        <h1>{{ text.unauthorizedTitle }}</h1>
        <p>{{ text.unauthorizedBody }}</p>
      </header>
      <div class="login-form">
        <button v-if="user" type="button" class="nv-btn" @click="signOut">{{ text.signOut }}</button>
        <NuxtLink v-else to="/login" class="nv-btn nv-btn-primary">{{ text.goToSignIn }}</NuxtLink>
      </div>
    </section>
  </main>
</template>
