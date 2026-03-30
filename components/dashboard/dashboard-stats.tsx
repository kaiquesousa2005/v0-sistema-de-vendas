'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Car, TrendingUp, Wallet, AlertCircle } from 'lucide-react'

interface Stats {
  totalVehicles: number
  vehiclesInStock: number
  vehiclesSold: number
  totalExpenses: number
  totalRevenue: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return <div>Carregando...</div>
  }

  if (!stats) {
    return <div>Erro ao carregar estatísticas</div>
  }

  const cards = [
    {
      title: 'Total de Veículos',
      value: stats.totalVehicles,
      icon: Car,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Em Estoque',
      value: stats.vehiclesInStock,
      icon: TrendingUp,
      color: 'bg-green-500/10 text-green-600 dark:text-green-400',
    },
    {
      title: 'Vendidos',
      value: stats.vehiclesSold,
      icon: Car,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Gastos Totais',
      value: `R$ ${stats.totalExpenses.toFixed(2)}`,
      icon: Wallet,
      color: 'bg-red-500/10 text-red-600 dark:text-red-400',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index} className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
