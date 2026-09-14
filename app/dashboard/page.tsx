import { Header } from '@/components/dashboard/header'
import { DashboardOverview } from '@/components/dashboard/dashboard-overview'

export const metadata = {
  title: 'Dashboard - AutoGest',
  description: 'Visão geral de vendas, gastos, estoque e lucros',
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

        <DashboardOverview />
      </main>
    </div>
  )
}
