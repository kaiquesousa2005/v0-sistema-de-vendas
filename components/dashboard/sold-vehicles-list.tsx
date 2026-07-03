'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/dashboard/header'
import { toast } from 'sonner'
import { Car, Bike, Edit, Loader2, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Wrench } from 'lucide-react'

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
  const [isLoading, setIsLoading] = useState(true)

  // Dialog de editar valor de venda
  const [editDialog, setEditDialog] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<SoldVehicle | null>(null)
  const [newSaleValue, setNewSaleValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchSoldVehicles()
  }, [])

  const fetchSoldVehicles = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/vehicles/sold')
      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Erro ao buscar veículos vendidos')
        return
      }
      const data = await response.json()
      setVehicles(data)
    } catch (error) {
      console.error('[v0] fetchSoldVehicles error:', error)
      toast.error('Erro de conexão ao buscar veículos vendidos')
    } finally {
      setIsLoading(false)
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
      fetchSoldVehicles()
    } catch (error) {
      console.error('[v0] handleUpdateSaleValue error:', error)
      toast.error('Erro de conexão ao atualizar veículo')
    } finally {
      setIsSaving(false)
    }
  }

  const totalRevenue = vehicles.reduce((sum, v) => sum + v.sale_value, 0)
  const totalCost = vehicles.reduce((sum, v) => sum + v.purchase_value, 0)
  const totalExpenses = vehicles.reduce((sum, v) => sum + v.total_expenses, 0)
  const totalProfit = totalRevenue - totalCost - totalExpenses

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Veículos Vendidos</h1>
          <p className="text-muted-foreground text-sm">Histórico completo de vendas da sua loja</p>
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

        {/* Cards de veículos */}
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

                  <Button size="sm" variant="outline" className="w-full" onClick={() => handleOpenEdit(vehicle)}>
                    <Edit className="w-3 h-3 mr-1" />
                    Editar Valor de Venda
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {vehicles.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Car className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum veículo vendido ainda.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
