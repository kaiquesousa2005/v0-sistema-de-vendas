import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { ContractView } from '@/components/dashboard/contract-view'

export const metadata = {
  title: 'Contrato - AutoGest',
  description: 'Visualizar e imprimir contrato',
}

export default async function ContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const contractId = Number.parseInt(id, 10)
  if (!Number.isFinite(contractId)) notFound()

  // Suspense porque ContractView lê searchParams (?print=1)
  return (
    <Suspense fallback={null}>
      <ContractView contractId={contractId} />
    </Suspense>
  )
}
