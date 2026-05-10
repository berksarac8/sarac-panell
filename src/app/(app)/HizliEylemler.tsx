'use client'

import * as React from 'react'
import { OdemeDialog } from './odemeler/OdemeDialog'
import { OlayDialog } from './olaylar/OlayDialog'
import { TartiDialog } from './suru/[donem-no]/TartiDialog'
import { OlumDialog } from './suru/[donem-no]/OlumDialog'
import type { OdemeKategori } from '@/types/odemeler'
import type { OlayKategori, SuruDonemRef } from '@/types/olaylar'

type Props = {
  odemeKategorileri: OdemeKategori[]
  olayKategorileri: OlayKategori[]
  donemler: SuruDonemRef[]
  aktifDonem: SuruDonemRef | null
  aktifDonemId: string | null
}

function HizliButon({
  label,
  icon,
  disabled = false,
  title,
}: {
  label: string
  icon: string
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      className="flex-1 min-w-[140px] rounded-lg border bg-card px-4 py-3 text-sm font-medium hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 disabled:hover:bg-card disabled:hover:border-input transition flex items-center gap-2 justify-center"
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
}: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      <OdemeDialog
        kategoriler={odemeKategorileri}
        trigger={<HizliButon label="Ödeme" icon="+" />}
      />
      <OlayDialog
        kategoriler={olayKategorileri}
        donemler={donemler}
        aktifDonem={aktifDonem}
        trigger={<HizliButon label="Olay" icon="+" />}
      />
      {aktifDonemId ? (
        <>
          <TartiDialog
            donemId={aktifDonemId}
            trigger={<HizliButon label="Tartı" icon="+" />}
          />
          <OlumDialog
            donemId={aktifDonemId}
            trigger={<HizliButon label="Ölüm" icon="+" />}
          />
        </>
      ) : (
        <>
          <HizliButon
            label="Tartı"
            icon="+"
            disabled
            title="Aktif sürü yok"
          />
          <HizliButon
            label="Ölüm"
            icon="+"
            disabled
            title="Aktif sürü yok"
          />
        </>
      )}
    </div>
  )
}
