'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/dashboard/header'
import { ContractDocument } from '@/components/dashboard/contract-document'
import { ContractFormDialog } from '@/components/dashboard/contract-form-dialog'
import { CONTRACT_TYPES, shortDatePt, type ContractType } from '@/lib/contracts'
import { ArrowLeft, Download, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

interface Contract {
  id: number
  type: ContractType
  contract_number: string
  contract_date: string
  data: unknown
}

/**
 * Abre a caixa de impressão do navegador com o número do contrato como título,
 * que também é o nome sugerido do arquivo em "Salvar como PDF".
 */
function printContract(fileName: string) {
  const previousTitle = document.title
  document.title = fileName
  window.print()
  // Restaura após o diálogo fechar para não afetar a navegação
  window.setTimeout(() => {
    document.title = previousTitle
  }, 500)
}

export function ContractView({ contractId }: { contractId: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [contract, setContract] = useState<Contract | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const loadContract = useCallback(async () => {
    try {
      const response = await fetch(`/api/contracts/${contractId}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar contrato')
      setContract(data)
      return data as Contract
    } catch (error) {
      console.error('[v0] load contract error:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar contrato')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    loadContract()
  }, [loadContract])

  // `?print=1` (usado pelo botão "Baixar PDF" da listagem) já abre a impressão
  useEffect(() => {
    if (!contract || searchParams.get('print') !== '1') return

    const timer = window.setTimeout(() => printContract(contract.contract_number), 600)
    // Limpa o parâmetro para não reimprimir ao voltar para a página
    router.replace(`/contratos/${contract.id}`)

    return () => window.clearTimeout(timer)
  }, [contract, searchParams, router])

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

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => printContract(contract.contract_number)}
            >
              <Download className="h-4 w-4" />
              Baixar PDF
            </Button>
          </div>
        </div>
      </div>

      <main className="px-4 py-6 print:p-0">
        <ContractDocument
          title={config?.title ?? 'CONTRATO'}
          data={contract.data}
          contractDate={contract.contract_date}
        />
      </main>

      <ContractFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        contractId={contract.id}
        onSaved={() => {
          setIsEditOpen(false)
          loadContract()
        }}
      />
    </div>
  )
}
