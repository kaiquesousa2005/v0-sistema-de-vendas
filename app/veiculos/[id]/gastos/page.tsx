import { Header } from '@/components/dashboard/header'
import { VehicleExpenses } from '@/components/dashboard/vehicle-expenses'

export const metadata = {
  title: 'Gastos do Veículo - AutoGest',
  description: 'Gerenciar gastos de um veículo específico',
}

export default function VehicleGastosPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <VehicleExpenses params={params} />
      </main>
    </div>
  )
}
