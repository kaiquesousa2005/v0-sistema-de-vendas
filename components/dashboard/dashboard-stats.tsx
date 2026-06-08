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
      value: Number(stats.totalVehicles) || 0,
      icon: Car,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Em Estoque',
      value: Number(stats.vehiclesInStock) || 0,
      icon: TrendingUp,
      color: 'bg-green-500/10 text-green-600 dark:text-green-400',
    },
    {
      title: 'Vendidos',
      value: Number(stats.vehiclesSold) || 0,
      icon: Car,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Gastos Totais',
      value: `R$ ${(Number(stats.totalExpenses) || 0).toFixed(2)}`,
      icon: Wallet,
      color: 'bg-red-500/10 text-red-600 dark:text-red-400',
    },
    {
      title: 'Receita Total',
      value: `R$ ${(Number(stats.totalRevenue) || 0).toFixed(2)}`,
      icon: AlertCircle,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
