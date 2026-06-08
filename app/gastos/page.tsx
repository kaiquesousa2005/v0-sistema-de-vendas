import { Header } from '@/components/dashboard/header'
import { VehiclesList } from '@/components/dashboard/vehicles-list'

export const metadata = {
  title: 'Gastos - AutoGest',
  description: 'Gerenciar veículos e gastos',
}

export default function GastosPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Gestão de Veículos</h1>
          <p className="text-muted-foreground">Adicionar, editar e gerenciar seus veículos</p>
        </div>
        <VehiclesList />
      </main>
    </div>
  )
}
