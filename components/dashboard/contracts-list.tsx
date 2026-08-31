'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PaginationBar } from '@/components/dashboard/pagination-bar'
import { Header } from '@/components/dashboard/header'
import { ContractFormDialog } from '@/components/dashboard/contract-form-dialog'
import { useDebounce } from '@/hooks/use-debounce'
import {
  CONTRACT_TYPES,
  CONTRACT_TYPE_KEYS,
  formatCurrency,
  shortDatePt,
  type ContractType,
} from '@/lib/contracts'
import {
  AlertTriangle,
  Download,
  FilePlus2,
  FileText,
  Loader2,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

interface ContractRow {
  id: number
  type: ContractType
  contract_number: string
  customer_name: string
  vehicle_label: string
  total_value: number
  contract_date: string
}

const LIMIT = 12

export function ContractsList() {
  const router = useRouter()

  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [typeFilter, setTypeFilter] = useState<'' | ContractType>('')

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ContractRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ContractRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadContracts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      if (typeFilter) params.set('type', typeFilter)

      const response = await fetch(`/api/contracts?${params}`)
      if (!response.ok) throw new Error('Falha ao buscar contratos')

      const data = await response.json()
      setContracts(data.contracts ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch (error) {
      console.error('[v0] load contracts error:', error)
      toast.error('Erro ao carregar contratos')
    } finally {
      setIsLoading(false)
    }
  }, [page, debouncedSearch, typeFilter])

  useEffect(() => {
    loadContracts()
  }, [loadContracts])

  // Volta para a primeira página sempre que a busca ou o filtro mudam
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, typeFilter])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/contracts/${deleteTarget.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error || 'Erro ao excluir contrato')
        return
      }
      toast.success('Contrato excluído')
      setDeleteTarget(null)
      loadContracts()
    } catch (error) {
      console.error('[v0] delete contract error:', error)
      toast.error('Erro de conexão ao excluir')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
          <p className="text-sm text-muted-foreground">
            Gere contratos a partir dos clientes e veículos já cadastrados.
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <FilePlus2 className="h-4 cursor-pointer w-4" />
          Criar contrato
        </Button>
      </div>

      {/* Busca e filtros */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número, cliente ou veículo..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={typeFilter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('')}
          >
            Todos
          </Button>
          {CONTRACT_TYPE_KEYS.map((key) => (
            <Button
              key={key}
              variant={typeFilter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter(key)}
            >
              {CONTRACT_TYPES[key].short}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando contratos...
        </div>
      ) : contracts.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">
              {search || typeFilter ? 'Nenhum contrato encontrado' : 'Nenhum contrato criado ainda'}
            </p>
            <p className="text-sm text-muted-foreground">
              {search || typeFilter
                ? 'Ajuste a busca ou o filtro de tipo.'
                : 'Clique em "Criar contrato" para gerar o primeiro.'}
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {contracts.map((contract) => {
              // Contrato salvo pela metade: o snapshot não vem na listagem, então
              // a falta é inferida dos campos resolvidos no momento da gravação.
              const isIncomplete =
                !contract.customer_name || !contract.vehicle_label || !contract.total_value

              return (
              <Card
                key={contract.id}
                className={`group flex items-start justify-between gap-3 p-4 transition-colors hover:border-primary/50 ${
                  isIncomplete ? 'border-amber-500/40' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => router.push(`/contratos/${contract.id}`)}
                  className="min-w-0 cursor-pointer flex-1 space-y-2 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold tabular-nums text-primary">
                      {contract.contract_number}
                    </span>
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      {CONTRACT_TYPES[contract.type]?.short ?? contract.type}
                    </Badge>
                    {isIncomplete && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-500/50 px-1.5 py-0 text-[10px] text-amber-600 dark:text-amber-500"
                      >
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Incompleto
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {shortDatePt(contract.contract_date)}
                    </span>
                  </div>

                  <p className="truncate text-sm font-semibold leading-tight">
                    {contract.customer_name || (
                      <span className="text-muted-foreground">Cliente não informado</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {contract.vehicle_label || 'Veículo não informado'}
                  </p>

                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrency(contract.total_value)}
                  </p>
                </button>

                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={() => setEditTarget(contract)}
                    aria-label={`Editar contrato ${contract.contract_number}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={() => router.push(`/contratos/${contract.id}?print=1`)}
                    aria-label={`Baixar PDF do contrato ${contract.contract_number}`}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(contract)}
                    aria-label={`Excluir contrato ${contract.contract_number}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
              )
            })}
          </div>

          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            limit={LIMIT}
            onPageChange={setPage}
            label="contratos"
          />
        </>
      )}

      </main>

      <ContractFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSaved={(id) => router.push(`/contratos/${id}`)}
      />

      {/* Edição in-place: mantém a listagem e recarrega ao salvar */}
      <ContractFormDialog
        open={editTarget !== null}
        onOpenChange={(o) => !o && setEditTarget(null)}
        contractId={editTarget?.id ?? null}
        onSaved={() => {
          setEditTarget(null)
          loadContracts()
        }}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              O contrato {deleteTarget?.contract_number} de {deleteTarget?.customer_name} será
              removido permanentemente. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive cursor-pointer text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
