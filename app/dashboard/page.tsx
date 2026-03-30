import { Suspense } from 'react'
import { Header } from '@/components/dashboard/header'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { VehiclesChart } from '@/components/dashboard/vehicles-chart'
import { ExpensesChart } from '@/components/dashboard/expenses-chart'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Dashboard - AutoGest',
  description: 'Dashboard com estatísticas de veículos e gastos',
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-lg" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>

        <Suspense fallback={<DashboardSkeleton />}>
          <div className="space-y-8">
            <DashboardStats />
            
            <div className="grid gap-6 md:grid-cols-2">
              <VehiclesChart />
              <ExpensesChart />
            </div>
          </div>
        </Suspense>
      </main>
    </div>
  )
}
