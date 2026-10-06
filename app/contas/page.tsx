import { Header } from '@/components/dashboard/header'
import { AccountsPage } from '@/components/dashboard/accounts-page'

export const metadata = {
  title: 'Contas a pagar - AutoGest',
  description: 'Organize e acompanhe as contas a pagar por mês.',
}

export default function ContasPage() {
  return <div className="min-h-screen bg-background"><Header /><main className="container mx-auto px-4 py-8"><AccountsPage /></main></div>
}
