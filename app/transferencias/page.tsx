import { Header } from '@/components/dashboard/header'
import { TransfersPage } from '@/components/dashboard/transfers/transfers-page'

export const metadata = {
  title: 'Transferências - KM Gestão',
  description: 'Acompanhe as etapas de transferência dos veículos',
}

export default function TransferenciasPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <TransfersPage />
      </main>
    </div>
  )
}
