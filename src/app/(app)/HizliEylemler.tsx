'use client'

import * as React from 'react'
import { OdemeDialog } from './odemeler/OdemeDialog'
import { OlayDialog } from './olaylar/OlayDialog'
import { TartiDialog } from './suru/[donem-no]/TartiDialog'
import { OlumDialog } from './suru/[donem-no]/OlumDialog'
import { VeriGirDialog } from './suru/[donem-no]/VeriGirDialog'
import type { OdemeKategori } from '@/types/odemeler'
import type { OlayKategori, SuruDonemRef } from '@/types/olaylar'

type Props = {
  odemeKategorileri: OdemeKategori[]
  olayKategorileri: OlayKategori[]
  donemler: SuruDonemRef[]
  aktifDonem: SuruDonemRef | null
  aktifDonemId: string | null
  aktifDonemGirisTarihi: string | null
}

function HizliButon({
  label,
  icon,
  disabled = false,
  title,
  onClick,
  variant = 'default',
}: {
  label: string
  icon: string
  disabled?: boolean
  title?: string
  onClick?: () => void
  variant?: 'default' | 'primary'
}) {
  const baseClasses =
    'flex-1 min-w-[140px] rounded-lg border px-4 py-3 text-sm font-medium disabled:opacity-50 transition flex items-center gap-2 justify-center'
  const variantClasses =
    variant === 'primary'
      ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 disabled:hover:bg-indigo-600'
      : 'bg-card hover:border-indigo-300 hover:bg-indigo-50 disabled:hover:bg-card disabled:hover:border-input'

  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses}`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

export function HizliEylemler({
  odemeKategorileri,
  olayKategorileri,
  donemler,
  aktifDonem,
  aktifDonemId,
  aktifDonemGirisTarihi,
}: Props) {
  const [odemeOpen, setOdemeOpen] = React.useState(false)
  const [olayOpen, setOlayOpen] = React.useState(false)
  const [tartiOpen, setTartiOpen] = React.useState(false)
  const [olumOpen, setOlumOpen] = React.useState(false)
  const [veriOpen, setVeriOpen] = React.useState(false)

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <HizliButon
          label="Ödeme"
          icon="+"
          onClick={() => setOdemeOpen(true)}
        />
        <HizliButon
          label="Olay"
          icon="+"
          onClick={() => setOlayOpen(true)}
        />
        <HizliButon
          label="Veri Gir"
          icon="+"
          variant="primary"
          disabled={!aktifDonemId}
          title={!aktifDonemId ? 'Aktif sürü yok' : 'Su + ölüm aynı anda'}
          onClick={() => setVeriOpen(true)}
        />
        <HizliButon
          label="Tartı"
          icon="+"
          disabled={!aktifDonemId}
          title={!aktifDonemId ? 'Aktif sürü yok' : undefined}
          onClick={() => setTartiOpen(true)}
        />
        <HizliButon
          label="Ölüm"
          icon="+"
          disabled={!aktifDonemId}
          title={!aktifDonemId ? 'Aktif sürü yok' : undefined}
          onClick={() => setOlumOpen(true)}
        />
      </div>

      <OdemeDialog
        kategoriler={odemeKategorileri}
        open={odemeOpen}
        onOpenChange={setOdemeOpen}
      />
      <OlayDialog
        kategoriler={olayKategorileri}
        donemler={donemler}
        aktifDonem={aktifDonem}
        open={olayOpen}
        onOpenChange={setOlayOpen}
      />
      {aktifDonemId && (
        <>
          <TartiDialog
            donemId={aktifDonemId}
            open={tartiOpen}
            onOpenChange={setTartiOpen}
          />
          <OlumDialog
            donemId={aktifDonemId}
            open={olumOpen}
            onOpenChange={setOlumOpen}
          />
          {aktifDonemGirisTarihi && (
            <VeriGirDialog
              donemId={aktifDonemId}
              girisTarihi={aktifDonemGirisTarihi}
              open={veriOpen}
              onOpenChange={setVeriOpen}
            />
          )}
        </>
      )}
    </>
  )
}
