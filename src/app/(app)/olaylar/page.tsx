export default function OlaylarPage() {
  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Olaylar</h1>
        <p className="text-sm text-ink-soft mt-1">Çiftlik olay defteri</p>
      </div>

      <div className="card-modern p-8 text-center">
        <div className="w-12 h-12 rounded-xl brand-gradient mx-auto mb-4 flex items-center justify-center text-white text-xl">
          🚧
        </div>
        <h2 className="text-lg font-semibold mb-1">Yapım aşamasında</h2>
        <p className="text-sm text-ink-muted">
          Liste, filtre çubuğu ve yeni olay dialog&apos;u Plan 2&apos;de gelecek.
        </p>
      </div>
    </div>
  )
}
