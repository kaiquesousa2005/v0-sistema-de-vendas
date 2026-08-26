'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/dashboard/header'
import { ContractDocument } from '@/components/dashboard/contract-document'
import { ContractFormDialog } from '@/components/dashboard/contract-form-dialog'
import { FitToWidth } from '@/components/dashboard/fit-to-width'
import {
  CONTRACT_TYPES,
  missingContractFields,
  shortDatePt,
  type ContractType,
} from '@/lib/contracts'
import { AlertTriangle, ArrowLeft, Download, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

interface Contract {
  id: number
  type: ContractType
  contract_number: string
  contract_date: string
  data: unknown
}

export function ContractView({ contractId }: { contractId: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [contract, setContract] = useState<Contract | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  const handleDownload = useCallback(async () => {
    const sheet = sheetRef.current?.querySelector<HTMLElement>('.contract-sheet')
    if (!sheet || !contract) return

    setIsDownloading(true)
    try {
      const { downloadContractPdf } = await import('@/lib/contract-pdf')
      await downloadContractPdf(sheet, contract.contract_number)
    } catch (error) {
      console.error('[v0] download pdf error:', error)
      toast.error('Erro ao gerar o PDF')
    } finally {
      setIsDownloading(false)
    }
  }, [contract])

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

  // `?print=1` vem do botão "Baixar PDF" da listagem: baixa automaticamente
  useEffect(() => {
    if (!contract || searchParams.get('print') !== '1') return

    // Pequeno atraso para o cabeçalho e as fontes já estarem renderizados
    const timer = window.setTimeout(() => handleDownload(), 700)
    // Limpa o parâmetro para não baixar de novo ao voltar para a página
    router.replace(`/contratos/${contract.id}`)

    return () => window.clearTimeout(timer)
  }, [contract, searchParams, router, handleDownload])

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
  // Contratos salvos incompletos continuam abrindo normalmente; o que falta
  // aparece como aviso em vez de virar erro de renderização.
  const missing = missingContractFields(contract.data)

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
            <Button size="sm" className="gap-2" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isDownloading ? 'Gerando PDF...' : 'Baixar PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Aviso de contrato incompleto — fora da folha, então não sai no PDF */}
      {missing.length > 0 && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 print:hidden">
          <div className="container mx-auto flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
            <p className="text-xs text-foreground">
              <span className="font-semibold">Contrato incompleto.</span> Falta preencher:{' '}
              {missing.join(', ')}.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setIsEditOpen(true)}
            >
              <Pencil className="h-3 w-3" />
              Completar
            </Button>
          </div>
        </div>
      )}

      {/* O PDF é gerado a partir do .contract-sheet dentro deste ref. O scale
          do FitToWidth é apenas visual e não afeta a captura. */}
      <main ref={sheetRef} className="px-4 py-6">
        <FitToWidth>
          <ContractDocument
            title={config?.title ?? 'CONTRATO'}
            data={contract.data}
            contractDate={contract.contract_date}
            type={contract.type}
          />
        </FitToWidth>
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
