import { Header } from '@/components/dashboard/header'
import { VehiclesList } from '@/components/dashboard/vehicles-list'

export const metadata = {
  title: 'Veículos - AutoGest',
  description: 'Gerenciar veículos em estoque, marcadores e gastos',
}

export default function VeiculosPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Veículos</h1>
          <p className="text-muted-foreground">Adicione, edite e acompanhe a etapa de cada veículo</p>
        </div>
        <VehiclesList />
      </main>
    </div>
  )
}
