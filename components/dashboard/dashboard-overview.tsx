'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Car,
  Warehouse,
  BadgeCheck,
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  Coins,
} from 'lucide-react'
import {
  RevenueExpensesChart,
  MonthlyProfitChart,
  VehicleStatusChart,
  ExpenseCategoryChart,
  StockBrandChart,
  type MonthlyPoint,
  type StatusPoint,
  type CategoryPoint,
  type BrandPoint,
} from '@/components/dashboard/dashboard-charts'

interface Overview {
  kpis: {
    totalVehicles: number
    vehiclesInStock: number
    vehiclesSold: number
    totalRevenue: number
    totalExpenses: number
    grossProfit: number
    netProfit: number
    stockValue: number
    totalCustomers: number
  }
  monthly: MonthlyPoint[]
  vehiclesByStatus: StatusPoint[]
  expensesByCategory: CategoryPoint[]
  stockByBrand: BrandPoint[]
}

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

interface KpiCard {
  title: string
  value: string
  hint?: string
  icon: typeof Car
  tint: string
  valueClass?: string
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[380px] w-full rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[340px] w-full rounded-lg" />
        <Skeleton className="h-[340px] w-full rounded-lg" />
      </div>
    </div>
  )
}

export function DashboardOverview() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/dashboard/overview', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((json) => setData(json))
      .catch((e) => {
        if (e.name !== 'AbortError') {
          console.error('[v0] dashboard overview fetch error:', e)
          setError(true)
        }
      })
      .finally(() => setIsLoading(false))
    return () => controller.abort()
  }, [])

  if (isLoading) return <DashboardSkeleton />
  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Não foi possível carregar os dados do dashboard. Tente novamente.
        </CardContent>
      </Card>
    )
  }

  const k = data.kpis
  const cards: KpiCard[] = [
    {
      title: 'Em estoque',
      value: String(k.vehiclesInStock),
      hint: `${brl(k.stockValue)} investidos`,
      icon: Warehouse,
      tint: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Vendidos',
      value: String(k.vehiclesSold),
      hint: `${k.totalVehicles} no total`,
      icon: BadgeCheck,
      tint: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Faturamento',
      value: brl(k.totalRevenue),
      hint: 'Vendas realizadas',
      icon: Coins,
      tint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Gastos totais',
      value: brl(k.totalExpenses),
      hint: 'Investido em manutenção',
      icon: Wallet,
      tint: 'bg-red-500/10 text-red-600 dark:text-red-400',
    },
    {
      title: 'Lucro bruto',
      value: brl(k.grossProfit),
      hint: 'Venda menos compra',
      icon: TrendingUp,
      tint: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    },
    {
      title: 'Lucro líquido',
      value: brl(k.netProfit),
      hint: 'Já descontados os gastos',
      icon: k.netProfit >= 0 ? TrendingUp : TrendingDown,
      tint:
        k.netProfit >= 0
          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
          : 'bg-red-500/10 text-red-600 dark:text-red-400',
      valueClass: k.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-500',
    },
    {
      title: 'Clientes',
      value: String(k.totalCustomers),
      hint: 'Cadastrados',
      icon: Users,
      tint: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Total de veículos',
      value: String(k.totalVehicles),
      hint: 'Estoque + vendidos',
      icon: Car,
      tint: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="border-border">
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className={`mt-1 truncate text-2xl font-bold ${card.valueClass ?? 'text-foreground'}`}>
                  {card.value}
                </p>
                {card.hint && <p className="mt-1 truncate text-xs text-muted-foreground">{card.hint}</p>}
              </div>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.tint}`}>
                <card.icon className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueExpensesChart data={data.monthly} />
        <VehicleStatusChart data={data.vehiclesByStatus} />
        <ExpenseCategoryChart data={data.expensesByCategory} />
        <MonthlyProfitChart data={data.monthly} />
        <StockBrandChart data={data.stockByBrand} />
      </div>
    </div>
  )
}
