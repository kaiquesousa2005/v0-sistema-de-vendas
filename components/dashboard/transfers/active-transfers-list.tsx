'use client'

import useSWR from 'swr'
import { ArrowLeftRight, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { jsonFetcher, type TransferPage, type TransferStatus } from '@/lib/transfers'
import { TransferCard } from './transfer-card'

export function ActiveTransfersList({
  status,
  onAdd,
}: {
  status: Exclude<TransferStatus, 'concluido'>
  onAdd: () => void
}) {
  const { data, error, isLoading, mutate } = useSWR<TransferPage>(
    `/api/transfers?status=${status}`,
    jsonFetcher,
  )

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/40 p-8 text-center">
        <p className="text-sm text-destructive">{error.message}</p>
        <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (data.items.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ArrowLeftRight aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>
            {status === 'nao_transferido' ? 'Nenhum veículo aguardando' : 'Nenhuma transferência em andamento'}
          </EmptyTitle>
          <EmptyDescription>
            {status === 'nao_transferido'
              ? 'Adicione um veículo para começar a acompanhar a transferência.'
              : 'Marque o DUT ou agende a vistoria de um veículo para ele aparecer aqui.'}
          </EmptyDescription>
        </EmptyHeader>
        {status === 'nao_transferido' && (
          <EmptyContent>
            <Button onClick={onAdd} className="gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar veículo
            </Button>
          </EmptyContent>
        )}
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.items.map((t) => (
          <li key={t.id}>
            <TransferCard transfer={t} />
          </li>
        ))}
      </ul>
      {data.hasMore && (
        <p className="text-center text-xs text-muted-foreground">
          Mostrando os 100 primeiros. Conclua transferências para liberar a lista.
        </p>
      )}
    </div>
  )
}
