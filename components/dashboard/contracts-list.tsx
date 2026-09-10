'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Header } from '@/components/dashboard/header'
import { ContractFormDialog } from '@/components/dashboard/contract-form-dialog'
import {
  RevenueStatementSheet,
  type StatementRow,
} from '@/components/dashboard/revenue-statement-sheet'
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
  Car,
  ChevronDown,
  ChevronRight,
  Download,
  FileDown,
  FilePlus2,
  FileText,
  Loader2,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'

interface ContractVehicleSummary {
  brand_model: string
  plate: string
  year: string
}

interface ContractRow {
  id: number
  type: ContractType
  contract_number: string
  customer_name: string
  vehicle_label: string
  vehicles: ContractVehicleSummary[]
  total_value: number
  contract_date: string
}

interface MonthRevenue {
  gross: number
  returns: number
  net: number
  salesCount: number
  returnsCount: number
}

const LIMIT = 12

/** Rótulo do mês atual, ex.: "janeiro de 2026". */
function currentMonthLabel() {
  const label = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

/**
 * Extrai ano e mês de uma data de contrato sem deixar o fuso mudar o mês:
 * a coluna vem como "YYYY-MM-DD", então lemos o prefixo direto em vez de
 * construir um Date (que interpretaria em UTC e poderia recuar um dia).
 */
function ymOf(value: string) {
  const m = /^(\d{4})-(\d{2})/.exec(String(value ?? ''))
  if (m) return { year: Number(m[1]), month: Number(m[2]) }
  const d = new Date(value)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function monthKeyOf(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function monthLabel(year: number, month: number) {
  return `${MONTHS_PT[month - 1]} ${year}`
}

/** Card individual de um contrato dentro do grupo do mês. */
function ContractCard({
  contract,
  onView,
  onEdit,
  onDownload,
  onDelete,
}: {
  contract: ContractRow
  onView: () => void
  onEdit: () => void
  onDownload: () => void
  onDelete: () => void
}) {
  // Contrato salvo pela metade: o snapshot não vem na listagem, então a falta
  // é inferida dos campos resolvidos no momento da gravação.
  const isIncomplete = !contract.customer_name || !contract.vehicle_label || !contract.total_value

  return (
    <Card
      className={`group flex items-start justify-between gap-2 rounded-lg p-3 transition-colors hover:border-primary/50 ${
        isIncomplete ? 'border-amber-500/40' : ''
      }`}
    >
      <button
        type="button"
        onClick={onView}
        className="min-w-0 cursor-pointer flex-1 space-y-1.5 text-left"
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

        {contract.vehicles.length > 0 ? (
          <ul className="space-y-0.5">
            {contract.vehicles.map((v, i) => {
              const year = v.year?.replace(/\//g, '').trim() ? v.year : ''
              return (
                <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Car className="h-3 w-3 shrink-0" />
                  <span className="min-w-0 truncate text-foreground">
                    {v.brand_model || 'Veículo'}
                  </span>
                  {(year || v.plate) && (
                    <span className="shrink-0 whitespace-nowrap tabular-nums">
                      {year && `· ${year}`}
                      {v.plate && <span className="font-mono"> · {v.plate}</span>}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="truncate text-xs text-muted-foreground">
            {contract.vehicle_label || 'Veículo não informado'}
          </p>
        )}

        <p className="text-sm font-semibold tabular-nums">
          {formatCurrency(contract.total_value)}
        </p>
      </button>

      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
          onClick={onEdit}
          aria-label={`Editar contrato ${contract.contract_number}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
          onClick={onDownload}
          aria-label={`Baixar PDF do contrato ${contract.contract_number}`}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label={`Excluir contrato ${contract.contract_number}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}

export function ContractsList() {
  const router = useRouter()

  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [monthRevenue, setMonthRevenue] = useState<MonthRevenue | null>(null)
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

  // Agrupamento por mês: quais meses estão abertos e quais foram marcados para
  // o demonstrativo de faturamento.
  const [monthOpen, setMonthOpen] = useState<Record<string, boolean>>({})
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set())
  const [isGeneratingStatement, setIsGeneratingStatement] = useState(false)
  const statementRef = useRef<HTMLDivElement>(null)

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
      setMonthRevenue(data.monthRevenue ?? null)
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

  // Agrupa os contratos carregados por mês/ano (desc). O faturamento de cada
  // mês soma vendas e repasses e desconta as devoluções, igual ao card do mês
  // atual e ao demonstrativo.
  const monthGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string
        year: number
        month: number
        label: string
        contracts: ContractRow[]
        revenue: number
      }
    >()

    for (const c of contracts) {
      const { year, month } = ymOf(c.contract_date)
      const key = monthKeyOf(year, month)
      let group = map.get(key)
      if (!group) {
        group = { key, year, month, label: monthLabel(year, month), contracts: [], revenue: 0 }
        map.set(key, group)
      }
      group.contracts.push(c)
      if (c.type === 'venda' || c.type === 'repasse') group.revenue += c.total_value
      else if (c.type === 'devolucao') group.revenue -= c.total_value
    }

    return Array.from(map.values()).sort((a, b) => b.year - a.year || b.month - a.month)
  }, [contracts])

  // Linhas do demonstrativo: meses marcados, em ordem cronológica crescente
  // (como no modelo em papel, de janeiro a dezembro).
  const statementRows: StatementRow[] = useMemo(
    () =>
      monthGroups
        .filter((g) => selectedMonths.has(g.key))
        .slice()
        .sort((a, b) => a.year - b.year || a.month - b.month)
        .map((g) => ({
          key: g.key,
          monthName: MONTHS_PT[g.month - 1],
          year: g.year,
          amount: g.revenue,
        })),
    [monthGroups, selectedMonths],
  )

  const allSelected =
    monthGroups.length > 0 && monthGroups.every((g) => selectedMonths.has(g.key))

  const toggleMonthOpen = (key: string, defaultOpen: boolean) => {
    setMonthOpen((prev) => ({ ...prev, [key]: !(prev[key] ?? defaultOpen) }))
  }

  const toggleMonthSelected = (key: string) => {
    setSelectedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSelectAll = () => {
    const all = monthGroups.every((g) => selectedMonths.has(g.key))
    setSelectedMonths(all ? new Set() : new Set(monthGroups.map((g) => g.key)))
  }

  const handleDownloadStatement = async () => {
    if (statementRows.length === 0) return
    const node = statementRef.current?.querySelector<HTMLElement>('.contract-sheet')
    if (!node) return

    setIsGeneratingStatement(true)
    try {
      const { downloadContractPdf } = await import('@/lib/contract-pdf')
      await downloadContractPdf(node, 'Demonstrativo de Faturamento')
    } catch (error) {
      console.error('[v0] download statement error:', error)
      toast.error('Erro ao gerar o demonstrativo')
    } finally {
      setIsGeneratingStatement(false)
    }
  }

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
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 cursor-pointer">
          <FilePlus2 className="h-4 w-4" />
          Criar contrato
        </Button>
      </div>

      {/* Faturamento do mês: vendas + repasses, descontadas as devoluções */}
      {monthRevenue && (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Faturamento de {currentMonthLabel()}
                </p>
                <p className="text-2xl font-bold tabular-nums leading-tight">
                  {formatCurrency(monthRevenue.net)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-5 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    Vendas e repasses ({monthRevenue.salesCount})
                  </p>
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(monthRevenue.gross)}
                  </p>
                </div>
              </div>
              {monthRevenue.returns > 0 && (
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      Devoluções ({monthRevenue.returnsCount})
                    </p>
                    <p className="font-semibold tabular-nums text-destructive">
                      -{formatCurrency(monthRevenue.returns)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

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
            className="cursor-pointer"
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
              className="cursor-pointer"
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
        <div className="space-y-4">
          {/* Seleção de meses para o demonstrativo */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="cursor-pointer text-xs font-medium text-primary hover:underline"
            >
              {allSelected ? 'Limpar seleção' : 'Selecionar todos os meses'}
            </button>
            {selectedMonths.size > 0 && (
              <Button
                size="sm"
                className="gap-2 cursor-pointer"
                onClick={handleDownloadStatement}
                disabled={isGeneratingStatement}
              >
                {isGeneratingStatement ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                {isGeneratingStatement
                  ? 'Gerando demonstrativo...'
                  : `Baixar demonstrativo (${selectedMonths.size})`}
              </Button>
            )}
          </div>

          {monthGroups.map((group, index) => {
            const open = monthOpen[group.key] ?? index === 0
            const selected = selectedMonths.has(group.key)
            const recibos = group.contracts.length

            return (
              <div key={group.key} className="overflow-hidden rounded-lg border">
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                    selected ? 'bg-primary/10' : 'bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => toggleMonthSelected(group.key)}
                    aria-label={`Selecionar ${group.label} para o demonstrativo`}
                    className="cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => toggleMonthOpen(group.key, index === 0)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                  >
                    {open ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
                    )}
                    <span className="truncate font-semibold text-primary">{group.label}</span>
                  </button>
                  <span className="shrink-0 text-sm font-bold tabular-nums">
                    {formatCurrency(group.revenue)}
                  </span>
                  <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                    {recibos} {recibos === 1 ? 'recibo' : 'recibos'}
                  </span>
                </div>

                {open && (
                  <div className="grid gap-2.5 border-t p-3 md:grid-cols-2">
                    {group.contracts.map((contract) => (
                      <ContractCard
                        key={contract.id}
                        contract={contract}
                        onView={() => router.push(`/contratos/${contract.id}`)}
                        onEdit={() => setEditTarget(contract)}
                        onDownload={() => router.push(`/contratos/${contract.id}?print=1`)}
                        onDelete={() => setDeleteTarget(contract)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
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

      {/* Folha do demonstrativo renderizada fora da tela; é o nó capturado
          para o PDF ao clicar em "Baixar demonstrativo". */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-[-10000px] top-0"
        ref={statementRef}
      >
        <RevenueStatementSheet rows={statementRows} />
      </div>
    </div>
  )
}
