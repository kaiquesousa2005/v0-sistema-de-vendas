'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/dashboard/header'
import { ContractDocument } from '@/components/dashboard/contract-document'
import { CONTRACT_TYPES, shortDatePt, type ContractType, type SaleContractData } from '@/lib/contracts'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'

interface Contract {
  id: number
  type: ContractType
  contract_number: string
  contract_date: string
  data: SaleContractData
}

export function ContractView({ contractId }: { contractId: number }) {
  const router = useRouter()
  const [contract, setContract] = useState<Contract | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/contracts/${contractId}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Erro ao carregar contrato')
        if (!cancelled) setContract(data)
      })
      .catch((error) => {
        console.error('[v0] load contract error:', error)
        if (!cancelled) toast.error(error.message)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [contractId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando contrato...
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="font-medium">Contrato não encontrado</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => router.push('/contratos')}>
            <ArrowLeft className="h-4 w-4" />
            Voltar para contratos
          </Button>
        </main>
      </div>
    )
  }

  const config = CONTRACT_TYPES[contract.type]

  return (
    <div className="min-h-screen bg-muted/40 print:bg-white">
      <div className="print:hidden">
        <Header />
      </div>

      {/* Barra de ações — oculta na impressão */}
      <div className="border-b border-border bg-background print:hidden">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => router.push('/contratos')}
            >
              <ArrowLeft className="h-4 w-4" />
              Contratos
            </Button>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold tabular-nums">
                {contract.contract_number}
              </span>
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {config?.short ?? contract.type}
              </Badge>
              <span className="text-xs text-muted-foreground tabular-nums">
                {shortDatePt(contract.contract_date)}
              </span>
            </div>
          </div>

          <Button size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir / Salvar PDF
          </Button>
        </div>
      </div>

      <main className="px-4 py-6 print:p-0">
        <ContractDocument
          title={config?.title ?? 'CONTRATO'}
          data={contract.data}
          contractDate={contract.contract_date}
        />
      </main>
    </div>
  )
}
