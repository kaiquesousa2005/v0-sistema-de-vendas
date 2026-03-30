import { Header } from '@/components/dashboard/header'
import { AdminPanel } from '@/components/admin/admin-panel'

export const metadata = {
  title: 'Painel de Administração - AutoGest',
  description: 'Gerenciar lojas e usuários',
}

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Painel de Administração</h1>
          <p className="text-muted-foreground">Gerenciar lojas cadastradas</p>
        </div>
        <AdminPanel />
      </main>
    </div>
  )
}
