'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface Vehicle {
  id: number
  type: string
  plate: string
  brand: string
  model: string
  purchase_value: number
  sale_value: number
  sold_at: string
}

export function SoldVehiclesList() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSoldVehicles()
  }, [])

  const fetchSoldVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles/sold')
      if (response.ok) {
        const data = await response.json()
        setVehicles(data)
      } else {
        toast.error('Erro ao buscar veículos vendidos')
      }
    } catch (error) {
      console.error('[v0] Fetch error:', error)
      toast.error('Erro ao buscar veículos vendidos')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-center">Carregando veículos vendidos...</div>
  }

  const totalRevenue = vehicles.reduce((sum, v) => sum + v.sale_value, 0)
  const totalCost = vehicles.reduce((sum, v) => sum + v.purchase_value, 0)
  const totalProfit = totalRevenue - totalCost

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Investido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {totalProfit.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => {
          const profit = vehicle.sale_value - vehicle.purchase_value
          const profitPercent = ((profit / vehicle.purchase_value) * 100).toFixed(1)

          return (
            <Card key={vehicle.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{vehicle.brand} {vehicle.model}</CardTitle>
                    <p className="text-sm text-muted-foreground">{vehicle.plate}</p>
                  </div>
                  <div className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded">
                    Vendido
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Tipo:</span> {vehicle.type}</p>
                  <p><span className="font-medium">Compra:</span> R$ {vehicle.purchase_value.toFixed(2)}</p>
                  <p><span className="font-medium">Venda:</span> R$ {vehicle.sale_value.toFixed(2)}</p>
                  <p className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Lucro: R$ {profit.toFixed(2)} ({profitPercent}%)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vendido em: {new Date(vehicle.sold_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {vehicles.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">Nenhum veículo vendido ainda. Marque um veículo como vendido para vê-lo aqui.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
