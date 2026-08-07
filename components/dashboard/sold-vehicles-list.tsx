'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/dashboard/header'
import { toast } from 'sonner'
import { Car, Bike, Edit, Loader2, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Wrench, Undo2, Search, X } from 'lucide-react'
import { PaginationBar } from '@/components/dashboard/pagination-bar'
import { useDebounce } from '@/hooks/use-debounce'

const PAGE_SIZE = 12

interface Summary {
  totalSales: number
  totalInvested: number
  totalExpenses: number
  netProfit: number
}

interface SoldVehicle {
  id: number
  type: string
  plate: string
  brand: string
  model: string
  version?: string
  manufacture_year: number
  model_year: number
  purchase_value: number
  sale_value: number
  total_expenses: number
  sold_at: string
  renavam: string
  chassis: string
}

export function SoldVehiclesList() {
  const [vehicles, setVehicles] = useState<SoldVehicle[]>([])
  const [summary, setSummary] = useState<Summary>({
    totalSales: 0, totalInvested: 0, totalExpenses: 0, netProfit: 0,
  })
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [isLoading, setIsLoading] = useState(true)

  // Dialog de editar valor de venda
  const [editDialog, setEditDialog] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<SoldVehicle | null>(null)
  const [newSaleValue, setNewSaleValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [revertingId, setRevertingId] = useState<number | null>(null)

  const fetchSoldVehicles = useCallback(async (targetPage: number, term: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(PAGE_SIZE),
      })
      if (term.trim()) params.set('search', term.trim())

      const response = await fetch(`/api/vehicles/sold?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Erro ao buscar veículos vendidos')
        return
      }
      setVehicles(data.vehicles ?? [])
      if (data.summary) setSummary(data.summary)
      setTotal(Number(data.total) || 0)
      setTotalPages(Number(data.totalPages) || 1)
    } catch (error) {
      console.error('[v0] fetchSoldVehicles error:', error)
      toast.error('Erro de conexão ao buscar veículos vendidos')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Volta para a primeira página sempre que o termo de busca muda
  useEffect(() => { setPage(1) }, [debouncedSearch])

  useEffect(() => {
    fetchSoldVehicles(page, debouncedSearch)
  }, [page, debouncedSearch, fetchSoldVehicles])

  const reload = () => fetchSoldVehicles(page, debouncedSearch)

  const handleRevertToStock = async (vehicle: SoldVehicle) => {
    if (!confirm(`Tem certeza que deseja voltar "${vehicle.brand} ${vehicle.model} (${vehicle.plate})" para o estoque? O valor de venda será removido.`)) return

    setRevertingId(vehicle.id)
    try {
      const response = await fetch('/api/vehicles/sold', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId: vehicle.id }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Erro ao reverter venda')
        return
      }
      toast.success(`${vehicle.brand} ${vehicle.model} voltou ao estoque`)
      reload()
    } catch (error) {
      console.error('[v0] handleRevertToStock error:', error)
      toast.error('Erro de conexão ao reverter venda')
    } finally {
      setRevertingId(null)
    }
  }

  const handleOpenEdit = (vehicle: SoldVehicle) => {
    setEditingVehicle(vehicle)
    setNewSaleValue(vehicle.sale_value.toFixed(2))
    setEditDialog(true)
  }

  const handleUpdateSaleValue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingVehicle) return

    const val = parseFloat(newSaleValue)
    if (isNaN(val) || val <= 0) {
      toast.error('Informe um valor de venda válido maior que zero')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/vehicles/${editingVehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale_value: val }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Erro ao atualizar valor de venda')
        return
      }

      toast.success('Valor de venda atualizado com sucesso')
      setEditDialog(false)
      reload()
    } catch (error) {
      console.error('[v0] handleUpdateSaleValue error:', error)
      toast.error('Erro de conexão ao atualizar veículo')
    } finally {
      setIsSaving(false)
    }
  }

  // Totais vindos do servidor: consideram TODAS as vendas, não só a página atual
  const { totalSales: totalRevenue, totalInvested: totalCost, totalExpenses, netProfit: totalProfit } = summary

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Veículos Vendidos</h1>
          <p className="text-muted-foreground text-sm">
            {total} venda{total === 1 ? '' : 's'} registrada{total === 1 ? '' : 's'}
          </p>
        </div>

        {/* Resumo financeiro */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Investido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {totalCost.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {totalExpenses.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              {totalProfit >= 0
                ? <TrendingUp className="w-4 h-4 text-green-600" />
                : <TrendingDown className="w-4 h-4 text-red-600" />
              }
              <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Líquido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {totalProfit.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dialog Editar Valor de Venda */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Valor de Venda</DialogTitle>
            </DialogHeader>
            {editingVehicle && (
              <form onSubmit={handleUpdateSaleValue} className="space-y-4">
                <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                  <p><span className="font-medium">Veículo:</span> {editingVehicle.brand} {editingVehicle.model} ({editingVehicle.plate})</p>
                  <p><span className="font-medium">Valor de compra:</span> R$ {editingVehicle.purchase_value.toFixed(2)}</p>
                  <p><span className="font-medium">Gastos:</span> R$ {editingVehicle.total_expenses.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Novo Valor de Venda (R$) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newSaleValue}
                    onChange={(e) => setNewSaleValue(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Salvar
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Busca */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por placa, marca ou modelo..."
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Cards de veículos */}
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Carregando vendas...</span>
          </div>
        ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => {
            const profit = vehicle.sale_value - vehicle.purchase_value - vehicle.total_expenses
            const isProfit = profit >= 0

            return (
              <Card key={vehicle.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{vehicle.brand} {vehicle.model}</CardTitle>
                      <CardDescription className="font-mono">{vehicle.plate}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className="gap-1">
                        {vehicle.type === 'carro' ? <Car className="w-3 h-3" /> : <Bike className="w-3 h-3" />}
                        {vehicle.type === 'carro' ? 'Carro' : 'Moto'}
                      </Badge>
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                        Vendido
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  {vehicle.version && (
                    <p className="text-sm"><span className="font-medium">Versão:</span> {vehicle.version}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{vehicle.manufacture_year}/{vehicle.model_year}</p>

                  {/* Resumo financeiro do veículo */}
                  <div className="rounded-md border p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor de compra</span>
                      <span>R$ {vehicle.purchase_value.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gastos</span>
                      <span className="text-red-500">- R$ {vehicle.total_expenses.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor de venda</span>
                      <span className="text-green-600">R$ {vehicle.sale_value.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1.5 font-semibold">
                      <span>Lucro líquido</span>
                      <span className={isProfit ? 'text-green-600' : 'text-red-600'}>
                        {isProfit ? '+' : ''}R$ {profit.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Vendido em {new Date(vehicle.sold_at).toLocaleDateString('pt-BR')}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" className="w-full" onClick={() => handleOpenEdit(vehicle)}>
                      <Edit className="w-3 h-3 mr-1" />
                      Editar Venda
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={() => handleRevertToStock(vehicle)}
                      disabled={revertingId === vehicle.id}
                    >
                      {revertingId === vehicle.id
                        ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        : <Undo2 className="w-3 h-3 mr-1" />
                      }
                      Voltar Estoque
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
        )}

        {!isLoading && vehicles.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Car className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">
                {debouncedSearch
                  ? 'Nenhuma venda encontrada para essa busca.'
                  : 'Nenhum veículo vendido ainda.'}
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            limit={PAGE_SIZE}
            onPageChange={setPage}
            label="vendas"
          />
        )}
      </main>
    </div>
  )
}
