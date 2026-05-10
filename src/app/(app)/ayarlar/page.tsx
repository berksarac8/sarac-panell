import {
  getProfilOzet,
  listOdemeKategorileriDetay,
  listOlayKategorileriDetay,
} from '@/lib/actions/ayarlar'
import { AyarlarSayfa } from './AyarlarSayfa'

export const dynamic = 'force-dynamic'

export default async function AyarlarPage() {
  const [profilRes, odemeKatRes, olayKatRes] = await Promise.all([
    getProfilOzet(),
    listOdemeKategorileriDetay(),
    listOlayKategorileriDetay(),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Ayarlar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Profil bilgilerini, şifreni ve kategori listelerini buradan yönet.
        </p>
      </header>

      {profilRes.error && (
        <p className="text-sm text-rose-600">Hata: {profilRes.error}</p>
      )}

      {profilRes.data && (
        <AyarlarSayfa
          profil={profilRes.data}
          odemeKategorileri={odemeKatRes.data}
          olayKategorileri={olayKatRes.data}
        />
      )}
    </div>
  )
}
