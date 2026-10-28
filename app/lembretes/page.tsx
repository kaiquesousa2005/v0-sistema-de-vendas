import { Header } from '@/components/dashboard/header'
import { RemindersPage } from '@/components/dashboard/reminders-page'

export const metadata = {
  title: 'Lembretes - AutoGest',
  description: 'Lembretes de veículos e próximos aniversários de clientes',
}

export default function LembretesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Lembretes</h1>
          <p className="text-muted-foreground">Tarefas dos veículos e aniversários dos clientes</p>
        </div>
        <RemindersPage />
      </main>
    </div>
  )
}
