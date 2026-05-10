'use client'

import * as React from 'react'
import { VeriGirDialog } from './VeriGirDialog'

export function VeriGirButton({
  donemId,
  girisTarihi,
  defaultBlokNo = 1,
}: {
  donemId: string
  girisTarihi: string
  defaultBlokNo?: 1 | 2 | 3
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition inline-flex items-center gap-1.5"
      >
        <span>+</span>
        <span>Veri Gir (Su + Ölüm)</span>
      </button>
      <VeriGirDialog
        donemId={donemId}
        girisTarihi={girisTarihi}
        defaultBlokNo={defaultBlokNo}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
