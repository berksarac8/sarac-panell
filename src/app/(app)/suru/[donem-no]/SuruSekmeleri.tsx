'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { ReactNode } from 'react'

type Props = {
  ozet: ReactNode
  tarti: ReactNode
  olum: ReactNode
  yem: ReactNode
  olaylar: ReactNode
}

export function SuruSekmeleri({ ozet, tarti, olum, yem, olaylar }: Props) {
  return (
    <Tabs defaultValue="ozet" className="w-full">
      <TabsList>
        <TabsTrigger value="ozet">Özet</TabsTrigger>
        <TabsTrigger value="tarti">Tartı</TabsTrigger>
        <TabsTrigger value="olum">Ölüm</TabsTrigger>
        <TabsTrigger value="yem">Yem</TabsTrigger>
        <TabsTrigger value="olaylar">Olaylar</TabsTrigger>
      </TabsList>
      <TabsContent value="ozet">{ozet}</TabsContent>
      <TabsContent value="tarti">{tarti}</TabsContent>
      <TabsContent value="olum">{olum}</TabsContent>
      <TabsContent value="yem">{yem}</TabsContent>
      <TabsContent value="olaylar">{olaylar}</TabsContent>
    </Tabs>
  )
}
