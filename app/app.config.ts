// User-facing copy defaults to Turkish (the team's language); apps override any key in their own app.config.ts.
export default defineAppConfig({
  novatron: {
    appName: 'Novatron',
    badge: 'FRC 10202',
    messages: {
      signInTitle: 'Giriş Yap',
      signInSubtitle: 'Takım kullanıcı adın ve şifrenle giriş yap.',
      usernameLabel: 'Kullanıcı adı',
      passwordLabel: 'Şifre',
      submit: 'Giriş Yap',
      submitting: 'Giriş yapılıyor…',
      missingCredentials: 'Kullanıcı adını ve şifreni gir.',
      invalidCredentials: 'Kullanıcı adı veya şifre hatalı.',
      signInFailed: 'Giriş yapılamadı. Lütfen tekrar dene.',
      unauthorizedTitle: 'Erişim kısıtlı',
      unauthorizedBody: 'Bu hesabın bu uygulamaya erişim yetkisi yok. Takım liderinden HQ üzerinden bir rol atamasını iste.',
      signOut: 'Çıkış Yap',
      goToSignIn: 'Giriş Sayfasına Git',
      authRequired: 'Oturum açman gerekiyor.',
      accessDenied: 'Bu uygulamaya erişim yetkin yok.',
      roleDenied: 'Bu işlem için rolün yeterli değil.',
      permissionDenied: 'Bu işlem için yetkin yok.',
    },
  },
})
