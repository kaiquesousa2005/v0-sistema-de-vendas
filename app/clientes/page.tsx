'use client'

import { Header } from '@/components/dashboard/header'
import { CustomersList } from '@/components/dashboard/customers-list'

export default function ClientesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <CustomersList />
      </main>
    </div>
  )
}
