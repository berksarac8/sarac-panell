import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-surface relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 select-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent2/15 blur-3xl" />
      </div>

      <main className="relative w-full max-w-md">
        <div className="card-modern p-8 lift-in">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl brand-gradient flex items-center justify-center text-white font-bold text-lg shadow-md">
              S
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">Sarac</h1>
              <p className="text-xs text-ink-muted mt-0.5">Tavukçuluk yönetim paneli</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-1">Hoş geldin 👋</h2>
          <p className="text-sm text-ink-soft mb-6">
            Hesabına giriş yap, çiftliğin günü seni bekliyor.
          </p>

          <LoginForm />
        </div>

        <p className="text-center text-xs mt-5 text-ink-muted">
          Sarac Tavukçuluk · İç kullanım
        </p>
      </main>
    </div>
  )
}
