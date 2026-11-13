'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, CircleDashed, Loader, CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { jsonFetcher, type TransferStatus, type TransferSummary } from '@/lib/transfers'
import { AddTransferDialog } from './add-transfer-dialog'
import { ActiveTransfersList } from './active-transfers-list'
import { CompletedTransfersList } from './completed-transfers-list'

const tabs: { value: TransferStatus; label: string; icon: typeof CircleDashed }[] = [
  { value: 'nao_transferido', label: 'Não transferidos', icon: CircleDashed },
  { value: 'em_processo', label: 'Em processo', icon: Loader },
  { value: 'concluido', label: 'Concluídos', icon: CircleCheck },
]

export function TransfersPage() {
  const [tab, setTab] = useState<TransferStatus>('nao_transferido')
  const [addOpen, setAddOpen] = useState(false)
  const { data: summary } = useSWR<TransferSummary>('/api/transfers/summary', jsonFetcher)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transferências</h1>
          <p className="text-muted-foreground">Acompanhe cada etapa até a transferência ser concluída</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Adicionar veículo
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TransferStatus)} className="gap-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto sm:w-auto">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-2 px-3 py-1.5">
              <t.icon className="h-4 w-4" aria-hidden="true" />
              {t.label}
              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
                {summary ? summary[t.value] : '–'}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="nao_transferido">
          <ActiveTransfersList status="nao_transferido" onAdd={() => setAddOpen(true)} />
        </TabsContent>
        <TabsContent value="em_processo">
          <ActiveTransfersList status="em_processo" onAdd={() => setAddOpen(true)} />
        </TabsContent>
        <TabsContent value="concluido">
          <CompletedTransfersList />
        </TabsContent>
      </Tabs>

      <AddTransferDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => setTab('nao_transferido')}
      />
    </div>
  )
}
