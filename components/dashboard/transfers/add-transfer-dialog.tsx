'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Search, Car } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { jsonFetcher, revalidateTransfers, sendJson } from '@/lib/transfers'

type AvailableVehicle = {
  id: number
  plate: string
  brand: string
  model: string
  version: string | null
  model_year: number | null
  status: string
}

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function AddTransferDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: () => void
}) {
  const [query, setQuery] = useState('')
  const [addingId, setAddingId] = useState<number | null>(null)
  const debounced = useDebounced(query.trim())

  const { data, error, isLoading } = useSWR<{ vehicles: AvailableVehicle[] }>(
    open ? `/api/transfers/available-vehicles?q=${encodeURIComponent(debounced)}` : null,
    jsonFetcher,
    { keepPreviousData: true },
  )

  const handleAdd = async (vehicle: AvailableVehicle) => {
    if (addingId) return
    setAddingId(vehicle.id)
    try {
      await sendJson('/api/transfers', 'POST', { vehicleId: vehicle.id })
      toast.success(`${vehicle.plate} adicionado às transferências`)
      await revalidateTransfers()
      onAdded()
      onOpenChange(false)
      setQuery('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar')
    } finally {
      setAddingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar veículo</DialogTitle>
          <DialogDescription>
            Escolha um veículo cadastrado, vendido ou em estoque, para acompanhar a transferência.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por placa, marca ou modelo"
            className="pl-9"
            aria-label="Buscar veículo"
          />
        </div>

        <div className="max-h-80 overflow-y-auto rounded-md border border-border" aria-live="polite">
          {error ? (
            <p className="p-6 text-center text-sm text-destructive">{error.message}</p>
          ) : isLoading && !data ? (
            <div className="flex flex-col gap-2 p-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data?.vehicles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <Car className="h-6 w-6" aria-hidden="true" />
              {debounced
                ? 'Nenhum veículo encontrado ou ele já está nas transferências.'
                : 'Todos os veículos já estão nas transferências.'}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data?.vehicles.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => handleAdd(v)}
                    disabled={addingId !== null}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {v.brand} {v.model}
                        {v.model_year ? <span className="text-muted-foreground"> · {v.model_year}</span> : null}
                      </p>
                      <p className="font-mono text-xs uppercase text-muted-foreground">{v.plate}</p>
                    </div>
                    {addingId === v.id ? (
                      <Spinner />
                    ) : (
                      <Badge variant={v.status === 'vendido' ? 'secondary' : 'outline'} className="shrink-0">
                        {v.status === 'vendido' ? 'Vendido' : 'Em estoque'}
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
