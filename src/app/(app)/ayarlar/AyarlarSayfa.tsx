'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProfilTab } from './ProfilTab'
import { SifreTab } from './SifreTab'
import { KategoriYonetimTab } from './KategoriYonetimTab'
import type { ProfilOzet, KategoriDetay } from '@/types/ayarlar'

type Props = {
  profil: ProfilOzet
  odemeKategorileri: KategoriDetay[]
  olayKategorileri: KategoriDetay[]
}

export function AyarlarSayfa({ profil, odemeKategorileri, olayKategorileri }: Props) {
  const [tab, setTab] = useState('profil')

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="profil">Profil</TabsTrigger>
        <TabsTrigger value="sifre">Şifre</TabsTrigger>
        <TabsTrigger value="kategoriler">Kategoriler</TabsTrigger>
      </TabsList>

      <TabsContent value="profil" className="mt-4">
        <ProfilTab profil={profil} />
      </TabsContent>

      <TabsContent value="sifre" className="mt-4">
        <SifreTab />
      </TabsContent>

      <TabsContent value="kategoriler" className="mt-4 space-y-6">
        <KategoriYonetimTab
          baslik="Ödeme Kategorileri"
          aciklama="Çek/Fatura/Taksit gibi sistem kategorileri silinemez. Kendin yeni kategori ekleyebilir, silinebilenleri kaldırabilirsin."
          kategoriler={odemeKategorileri}
          tip="odeme"
        />
        <KategoriYonetimTab
          baslik="Olay Kategorileri"
          aciklama="Veteriner, Yem teslimat gibi sistem kategorileri silinemez. Kendi olay kategorilerini ekleyebilir, silinebilenleri kaldırabilirsin."
          kategoriler={olayKategorileri}
          tip="olay"
        />
      </TabsContent>
    </Tabs>
  )
}
