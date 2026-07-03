import { Header } from '@/components/dashboard/header'
import { SoldVehiclesList } from '@/components/dashboard/sold-vehicles-list'

export const metadata = {
  title: 'Vendidos - AutoGest',
  description: 'Ver veículos vendidos',
}

export default function VendidosPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Veículos Vendidos</h1>
          <p className="text-muted-foreground">Histórico de vendas</p>
        </div>
        <SoldVehiclesList />
      </main>
    </div>
  )
}
