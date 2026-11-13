'use client'

import { useEffect, useState } from 'react'
import useSWRInfinite from 'swr/infinite'
import { toast } from 'sonner'
import { CircleCheck, RefreshCw, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  formatDate,
  jsonFetcher,
  revalidateTransfers,
  sendJson,
  vehicleTitle,
  type Transfer,
  type TransferPage,
} from '@/lib/transfers'

function CompletedRow({ transfer: t }: { transfer: Transfer }) {
  const [reopening, setReopening] = useState(false)

  const handleReopen = async () => {
    setReopening(true)
    try {
      await sendJson(`/api/transfers/${t.id}`, 'PATCH', { action: 'reopen' })
      toast.success(`Transferência de ${t.plate} reaberta`)
      await revalidateTransfers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao reabrir')
      setReopening(false)
    }
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <CircleCheck className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
      <span className="w-20 shrink-0 font-mono text-xs font-semibold uppercase text-foreground">{t.plate}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {vehicleTitle(t)}
        {t.model_year ? <span className="text-muted-foreground"> · {t.model_year}</span> : null}
      </span>
      <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:inline">
        {formatDate(t.completed_at)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground"
        onClick={handleReopen}
        disabled={reopening}
        title="Reabrir transferência"
      >
        {reopening ? <Spinner /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
        <span className="sr-only">Reabrir transferência de {t.plate}</span>
      </Button>
    </li>
  )
}

export function CompletedTransfersList() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data, error, size, setSize, isLoading, isValidating, mutate } = useSWRInfinite<TransferPage>(
    (index, previous) => {
      if (previous && !previous.hasMore) return null
      const offset = index * 20
      return `/api/transfers?status=concluido&offset=${offset}&q=${encodeURIComponent(search)}`
    },
    jsonFetcher,
    { revalidateFirstPage: false },
  )

  const items = data?.flatMap((page) => page.items) ?? []
  const hasMore = data?.[data.length - 1]?.hasMore ?? false
  const loadingMore = isValidating && size > (data?.length ?? 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="relative sm:max-w-xs">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar placa ou modelo"
          className="pl-9"
          aria-label="Buscar transferências concluídas"
        />
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/40 p-8 text-center">
          <p className="text-sm text-destructive">{error.message}</p>
          <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleCheck aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{search ? 'Nada encontrado' : 'Nenhuma transferência concluída'}</EmptyTitle>
            <EmptyDescription>
              {search ? 'Tente buscar por outra placa ou modelo.' : 'As transferências finalizadas aparecem aqui.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {items.map((t) => (
              <CompletedRow key={t.id} transfer={t} />
            ))}
          </ul>
          {hasMore && (
            <Button
              variant="outline"
              className="self-center"
              onClick={() => setSize(size + 1)}
              disabled={loadingMore}
            >
              {loadingMore ? <Spinner /> : null}
              Carregar mais
            </Button>
          )}
        </>
      )}
    </div>
  )
}
