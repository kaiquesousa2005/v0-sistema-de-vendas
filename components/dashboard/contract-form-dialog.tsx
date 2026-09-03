'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EntityPicker, type PickerItem } from '@/components/dashboard/entity-picker'
import { ContractDocument } from '@/components/dashboard/contract-document'
import { FitToWidth } from '@/components/dashboard/fit-to-width'
import {
  CONTRACT_TYPES,
  CONTRACT_TYPE_KEYS,
  SALE_WARRANTY,
  formatCpf,
  normalizeSaleData,
  toIsoDate,
  contractRoles,
  todayIso,
  type ContractType,
  type SaleContractData,
} from '@/lib/contracts'
import {
  ArrowLeft,
  ArrowLeftRight,
  Car,
  Eye,
  FileSignature,
  FileText,
  HandCoins,
  Loader2,
  Lock,
  Plus,
  Repeat,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Undo2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

const TYPE_ICONS: Record<ContractType, typeof FileText> = {
  venda: FileSignature,
  compra: ShoppingCart,
  devolucao: Undo2,
  repasse: Repeat,
  consignacao: ArrowLeftRight,
  sinal: HandCoins,
}

/* ---------- Campos definidos no escopo do módulo ----------
   Definir estes componentes dentro do dialog faria o React remontar
   cada input a cada tecla, fazendo o foco pular para o modal. */

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  hint?: string
  className?: string
}

function Field({ label, value, onChange, placeholder, type = 'text', required, hint, className }: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <label className="text-xs font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function AreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  hint,
}: Omit<FieldProps, 'type'> & { rows?: number }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="resize-y"
      />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: typeof FileText
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/* ---------- Estado do formulário ---------- */

interface RawVehicle {
  id: number
  brand: string
  model: string
  version: string | null
  plate: string
  color: string | null
  fuel: string | null
  km: number | null
  manufacture_year: number
  model_year: number
}

/** Veículo vendido: escolhido no estoque, com ajustes por contrato. */
interface SoldRow {
  key: number
  item: PickerItem | null
  color: string
  fuel: string
  km: string
}

/** Veículo recebido em troca: digitado manualmente. */
interface TradeRow {
  key: number
  brand_model: string
  renavam: string
  plate: string
  chassis: string
  color: string
  year: string
  fuel: string
  km: string
}

let rowCounter = 0
const nextKey = () => ++rowCounter

const newSoldRow = (): SoldRow => ({ key: nextKey(), item: null, color: '', fuel: '', km: '' })

const newTradeRow = (): TradeRow => ({
  key: nextKey(),
  brand_model: '',
  renavam: '',
  plate: '',
  chassis: '',
  color: '',
  year: '',
  fuel: '',
  km: '',
})

interface ContractFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (contractId: number) => void
  /** Quando informado, o modal edita o contrato em vez de criar um novo. */
  contractId?: number | null
}

export function ContractFormDialog({
  open,
  onOpenChange,
  onSaved,
  contractId = null,
}: ContractFormDialogProps) {
  const isEditing = contractId != null

  const [step, setStep] = useState<'type' | 'form' | 'preview'>('type')
  const [type, setType] = useState<ContractType>('venda')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  /** Confirmação exibida quando o usuário tenta sair com o formulário preenchido. */
  const [confirmExit, setConfirmExit] = useState(false)

  /**
   * Na compra os papéis se invertem: o cliente é o VENDEDOR e a loja é a
   * COMPRADORA. Os rótulos saem daqui para o formulário não contradizer o
   * documento impresso, que usa o mesmo `contractRoles`.
   */
  const roles = contractRoles(type)
  const isPurchase = roles.storeIsBuyer
  const customerLabel = isPurchase ? 'Vendedor' : 'Comprador'
  const storeSignerLabel = isPurchase ? 'Nome do comprador' : 'Nome do vendedor'

  const [customer, setCustomer] = useState<PickerItem | null>(null)
  const [sold, setSold] = useState<SoldRow[]>([newSoldRow()])
  const [trades, setTrades] = useState<TradeRow[]>([])
  const vehicleCache = useRef<Map<number, RawVehicle>>(new Map())

  const [summary, setSummary] = useState('')
  const [totalValue, setTotalValue] = useState('')
  const [observations, setObservations] = useState('')

  // Exclusivos do contrato de sinal: valor da entrada e valor total do
  // veículo. `deliveryDate`/`deliveryTime` são reaproveitados como o prazo
  // para concretizar a compra — no sinal a seção "Entrega" muda de nome e
  // de sentido para "Finalização da Negociação", mas o par data/hora é o mesmo.
  const [signalValue, setSignalValue] = useState('')
  const [saleValue, setSaleValue] = useState('')

  const [contractDate, setContractDate] = useState(todayIso())
  const [deliveryDate, setDeliveryDate] = useState(todayIso())
  const [deliveryTime, setDeliveryTime] = useState('')

  const [storeAddress, setStoreAddress] = useState('')
  const [storeCity, setStoreCity] = useState('')
  const [sellerName, setSellerName] = useState('')

  // Prévia montada no servidor, com a mesma lógica do documento final
  const [preview, setPreview] = useState<{ data: SaleContractData; contractDate: string } | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)

  const resetForm = useCallback(() => {
    setStep('type')
    setType('venda')
    setCustomer(null)
    setSold([newSoldRow()])
    setTrades([])
    setSummary('')
    setTotalValue('')
    setObservations('')
    setSignalValue('')
    setSaleValue('')
    setContractDate(todayIso())
    setDeliveryDate(todayIso())
    setDeliveryTime('')
    setPreview(null)
  }, [])

  // Pré-carrega os dados da loja para o cabeçalho e a assinatura
  useEffect(() => {
    if (!open) return
    let cancelled = false

    fetch('/api/store/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setStoreAddress((prev) => prev || (data.address ?? ''))
        setStoreCity((prev) => prev || (data.city ?? ''))
        setSellerName((prev) => prev || (data.seller_name ?? ''))
      })
      .catch((error) => console.error('[v0] store profile error:', error))

    return () => {
      cancelled = true
    }
  }, [open])

  // Modo edição: carrega o contrato e reidrata o formulário a partir do snapshot
  useEffect(() => {
    if (!open || contractId == null) return
    let cancelled = false

    setIsLoading(true)
    fetch(`/api/contracts/${contractId}`)
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Erro ao carregar contrato')
        if (cancelled) return

        const data = normalizeSaleData(payload.data)

        setType((payload.type as ContractType) ?? 'venda')
        setCustomer(
          payload.customer_id
            ? {
                id: Number(payload.customer_id),
                primary: data.buyer.name,
                secondary: data.buyer.cpf ? formatCpf(data.buyer.cpf) : undefined,
              }
            : null,
        )

        setSold(
          data.vehicles.length > 0
            ? data.vehicles.map((v) => ({
                key: nextKey(),
                item: v.vehicle_id
                  ? { id: Number(v.vehicle_id), primary: v.brand_model, secondary: v.plate }
                  : null,
                color: v.color,
                fuel: v.fuel,
                km: v.km,
              }))
            : [newSoldRow()],
        )

        // `vehicle_id` não existe nas trocas (são digitadas), por isso é descartado
        setTrades(
          data.trade_ins.map((v) => ({
            key: nextKey(),
            brand_model: v.brand_model,
            renavam: v.renavam,
            plate: v.plate,
            chassis: v.chassis,
            color: v.color,
            year: v.year,
            fuel: v.fuel,
            km: v.km,
          })),
        )

        setSummary(data.negotiation.summary)
        setTotalValue(data.negotiation.total_value ? String(data.negotiation.total_value) : '')
        setObservations(data.negotiation.observations)
        setSignalValue(data.signal?.signal_value ? String(data.signal.signal_value) : '')
        setSaleValue(data.signal?.sale_value ? String(data.signal.sale_value) : '')
        setContractDate(toIsoDate(payload.contract_date) || todayIso())
        // No sinal, o prazo vem de `signal.deadline_*`; nos demais tipos, de
        // `delivery`. Os dois compartilham os mesmos campos de data/hora do
        // formulário.
        setDeliveryDate(data.signal?.deadline_date || data.delivery.date || '')
        setDeliveryTime(data.signal?.deadline_time || data.delivery.time || '')
        setStoreAddress(data.store.address)
        setStoreCity(data.store.city)
        setSellerName(data.store.seller_name)
        setStep('form')
      })
      .catch((error) => {
        console.error('[v0] load contract for edit error:', error)
        if (!cancelled) toast.error(error.message)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, contractId])

  const fetchCustomers = useCallback(async (search: string): Promise<PickerItem[]> => {
    const params = new URLSearchParams({ limit: '20' })
    if (search.trim()) params.set('search', search.trim())
    const response = await fetch(`/api/customers?${params}`)
    if (!response.ok) return []
    const data = await response.json()
    return (data.customers ?? []).map((c: Record<string, string>) => ({
      id: Number(c.id),
      primary: c.full_name,
      secondary: [c.cpf, c.phone].filter(Boolean).join(' · '),
    }))
  }, [])

  const fetchVehicles = useCallback(async (search: string): Promise<PickerItem[]> => {
    const params = new URLSearchParams({ limit: '20', includeSold: '1' })
    if (search.trim()) params.set('search', search.trim())
    const response = await fetch(`/api/vehicles?${params}`)
    if (!response.ok) return []
    const data = await response.json()
    const list: RawVehicle[] = data.vehicles ?? []
    list.forEach((v) => vehicleCache.current.set(Number(v.id), v))
    return list.map((v) => ({
      id: Number(v.id),
      primary: [v.brand, v.model, v.version].filter(Boolean).join(' '),
      secondary: [v.plate, `${v.manufacture_year}/${v.model_year}`].filter(Boolean).join(' · '),
    }))
  }, [])

  /** Ao escolher o veículo, pré-preenche cor, combustível e KM do cadastro. */
  const handleSoldVehicleChange = (key: number, item: PickerItem) => {
    const raw = vehicleCache.current.get(item.id)
    setSold((rows) =>
      rows.map((row) =>
        row.key === key
          ? {
              ...row,
              item,
              color: raw?.color ?? '',
              fuel: raw?.fuel ?? '',
              km: raw?.km != null ? String(raw.km) : '',
            }
          : row,
      ),
    )
  }

  const updateSold = (key: number, patch: Partial<SoldRow>) => {
    setSold((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const updateTrade = (key: number, patch: Partial<TradeRow>) => {
    setTrades((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const handleSelectType = (key: ContractType) => {
    if (!CONTRACT_TYPES[key].available) {
      toast.info(`${CONTRACT_TYPES[key].label} ainda não está disponível.`)
      return
    }
    setType(key)
    setStep('form')
  }

  const closeNow = useCallback(() => {
    setConfirmExit(false)
    onOpenChange(false)
    resetForm()
  }, [onOpenChange, resetForm])

  /**
   * Há algo digitado que seria perdido ao fechar? Endereço/cidade/vendedor não
   * entram na conta porque vêm pré-carregados do perfil da loja, não do usuário.
   */
  const hasContent =
    customer != null ||
    sold.some((row) => row.item) ||
    trades.length > 0 ||
    summary.trim() !== '' ||
    totalValue.trim() !== '' ||
    observations.trim() !== '' ||
    signalValue.trim() !== '' ||
    saleValue.trim() !== ''

  /**
   * Intercepta todas as formas de fechar (X, clique fora e Esc) — o Radix
   * encaminha as três para cá. Com conteúdo digitado, pede confirmação em vez
   * de descartar na hora.
   *
   * Só vale para criação: na edição o contrato já está salvo, então fechar não
   * perde o registro, apenas os ajustes não confirmados.
   */
  const handleClose = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true)
      return
    }
    if (!isEditing && hasContent) {
      setConfirmExit(true)
      return
    }
    closeNow()
  }

  /**
   * Grava o que já foi preenchido, sem passar pela validação de contrato
   * finalizado. Em caso de erro o modal fica aberto de propósito: fechar aqui
   * jogaria fora justamente o que o usuário pediu para preservar.
   */
  const handleSaveDraft = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(isEditing ? `/api/contracts/${contractId}` : '/api/contracts', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload(), draft: true }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Erro ao salvar contrato')
        setConfirmExit(false)
        return
      }

      toast.success(
        data.contract_number
          ? `Contrato ${data.contract_number} salvo incompleto`
          : 'Contrato salvo incompleto',
      )
      closeNow()
      onSaved(Number(data.id))
    } catch (error) {
      console.error('[v0] save draft error:', error)
      toast.error('Erro de conexão ao salvar contrato')
      setConfirmExit(false)
    } finally {
      setIsSaving(false)
    }
  }

  /** Payload enviado tanto para a prévia quanto para gravar. */
  const buildPayload = () => ({
    type,
    customer_id: customer?.id ?? null,
    vehicles: sold
      .filter((row) => row.item)
      .map((row) => ({
        vehicle_id: row.item!.id,
        color: row.color,
        fuel: row.fuel,
        km: row.km,
      })),
    // Sem veículo de entrada quando a loja é a compradora. Zera aqui para o caso
    // de o usuário ter preenchido trocas e depois trocado o tipo do contrato.
    trade_ins: roles.hasTradeIns ? trades.map(({ key: _key, ...rest }) => rest) : [],
    contract_date: contractDate,
    negotiation: {
      summary,
      total_value: Number(totalValue) || 0,
      observations,
    },
    // No sinal, data/hora significam o prazo para concretizar a compra, então
    // vão para `signal.deadline_*` em vez de `delivery`.
    delivery: roles.isSignal ? { date: '', time: '' } : { date: deliveryDate, time: deliveryTime },
    signal: roles.isSignal
      ? {
          signal_value: Number(signalValue) || 0,
          sale_value: Number(saleValue) || 0,
          deadline_date: deliveryDate,
          deadline_time: deliveryTime,
        }
      : undefined,
    store: { address: storeAddress, city: storeCity, seller_name: sellerName },
  })

  const handlePreview = async () => {
    setIsPreviewing(true)
    try {
      const response = await fetch('/api/contracts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const payload = await response.json()
      if (!response.ok) {
        toast.error(payload.error || 'Erro ao gerar prévia')
        return
      }
      setPreview({ data: payload.data, contractDate: payload.contract_date || contractDate })
      setStep('preview')
    } catch (error) {
      console.error('[v0] preview contract error:', error)
      toast.error('Erro de conexão ao gerar prévia')
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!customer) {
      toast.error(`Selecione o ${customerLabel.toLowerCase()}`)
      return
    }
    if (!sold.some((row) => row.item)) {
      toast.error('Selecione ao menos um veículo vendido')
      return
    }
    if (roles.isSignal) {
      if (!(Number(signalValue) > 0)) {
        toast.error('Informe o valor do sinal')
        return
      }
      if (!(Number(saleValue) > 0)) {
        toast.error('Informe o valor total do veículo')
        return
      }
      if (!deliveryDate) {
        toast.error('Informe a data para finalizar a negociação')
        return
      }
    } else if (!summary.trim()) {
      toast.error('Descreva a forma de negociação')
      return
    }
    if (!sellerName.trim()) {
      toast.error('Informe o nome do vendedor')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(isEditing ? `/api/contracts/${contractId}` : '/api/contracts', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Erro ao salvar contrato')
        return
      }

      toast.success(isEditing ? 'Contrato atualizado' : `Contrato ${data.contract_number} criado`)
      handleClose(false)
      onSaved(Number(data.id))
    } catch (error) {
      console.error('[v0] save contract error:', error)
      toast.error('Erro de conexão ao salvar contrato')
    } finally {
      setIsSaving(false)
    }
  }

  const showTypeStep = step === 'type' && !isEditing

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={step !== 'preview'}
        className={
          step === 'preview'
            ? // Prévia ocupa a tela inteira: sem limite de largura/altura, sem
              // arredondamento e sem translate de centralização. O scroll fica
              // na área do documento, não no diálogo.
              'flex h-screen max-h-screen w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 !rounded-none border-0 p-0 top-0 left-0 sm:max-w-none'
            : // `sm:max-w-*` é obrigatório aqui: o DialogContent já traz
              // `sm:max-w-lg` e o tailwind-merge trata prefixo de variante como
              // chave própria, então só `max-w-6xl` não sobrescreveria nada.
              'max-h-[92vh] w-[96vw] max-w-6xl overflow-y-auto sm:max-w-6xl'
        }
      >
        {isLoading ? (
          <>
            {/* Título/descrição são exigidos pelo Dialog do Radix em todos os
                estados; ficam apenas para leitores de tela no carregamento. */}
            <DialogHeader className="sr-only">
              <DialogTitle>Carregando contrato</DialogTitle>
              <DialogDescription>Aguarde enquanto os dados são carregados.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando contrato...
            </div>
          </>
        ) : showTypeStep ? (
          <>
            <DialogHeader>
              <DialogTitle>Novo contrato</DialogTitle>
              <DialogDescription>Escolha o tipo de contrato que deseja gerar.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              {CONTRACT_TYPE_KEYS.map((key) => {
                const cfg = CONTRACT_TYPES[key]
                // Fallback: um tipo novo sem ícone mapeado deixaria `Icon`
                // undefined e derrubaria a tela inteira do seletor.
                const Icon = TYPE_ICONS[key] ?? FileText
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectType(key)}
                    disabled={!cfg.available}
                    className="group flex items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-transparent"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{cfg.short}</span>
                        {!cfg.available && (
                          <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px]">
                            <Lock className="h-2.5 w-2.5" />
                            Em breve
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs leading-snug text-muted-foreground">{cfg.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        ) : step === 'preview' ? (
          <>
            {/* Barra de ações fixa no topo */}
            <DialogHeader className="shrink-0 flex-row items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 text-left sm:px-6">
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 shrink-0 p-0"
                  onClick={() => setStep('form')}
                  aria-label="Voltar para a edição"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <DialogTitle className="text-sm">Prévia do contrato</DialogTitle>
                  <DialogDescription className="truncate text-xs">
                    Campos não preenchidos aparecem como &quot;—&quot;. Nada foi salvo ainda.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setStep('form')}>
                  Voltar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSubmit()}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSignature className="h-4 w-4" />
                  )}
                  {isEditing ? 'Salvar' : 'Gerar contrato'}
                </Button>
              </div>
            </DialogHeader>

            {/* Área rolável; FitToWidth encolhe a folha A4 em telas estreitas */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
              <FitToWidth>
                <ContractDocument
                  title={CONTRACT_TYPES[type].title}
                  data={preview?.data}
                  contractDate={preview?.contractDate ?? contractDate}
                  type={type}
                />
              </FitToWidth>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {!isEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setStep('type')}
                    aria-label="Voltar para a escolha do tipo"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                {isEditing ? `Editar ${CONTRACT_TYPES[type].label}` : CONTRACT_TYPES[type].label}
              </DialogTitle>
              <DialogDescription>
                Os dados do {customerLabel.toLowerCase()} e dos veículos vêm do cadastro. Complete a
                negociação abaixo.
              </DialogDescription>
            </DialogHeader>

            {/* Cliente: comprador na venda, vendedor na compra */}
            <Section icon={User} title={customerLabel}>
              <EntityPicker
                value={customer}
                onChange={setCustomer}
                fetcher={fetchCustomers}
                placeholder="Selecionar cliente cadastrado"
                searchPlaceholder="Buscar por nome, CPF ou telefone..."
                emptyText="Nenhum cliente encontrado."
              />
            </Section>

            {/* Veículos do contrato: vendidos ao cliente ou comprados dele */}
            <Section
              icon={Car}
              title={isPurchase ? 'Veículos comprados' : 'Veículos vendidos'}
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setSold((rows) => [...rows, newSoldRow()])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              }
            >
              <div className="space-y-4">
                {sold.map((row, index) => (
                  <div
                    key={row.key}
                    className="space-y-3 rounded-md border border-dashed border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Veículo {index + 1}
                      </span>
                      {sold.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setSold((rows) => rows.filter((r) => r.key !== row.key))}
                          aria-label={`Remover veículo ${index + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <EntityPicker
                      value={row.item}
                      onChange={(item) => handleSoldVehicleChange(row.key, item)}
                      fetcher={fetchVehicles}
                      placeholder="Selecionar veículo cadastrado"
                      searchPlaceholder="Buscar por placa, marca ou modelo..."
                      emptyText="Nenhum veículo encontrado."
                    />

                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field
                        label="Cor"
                        value={row.color}
                        onChange={(v) => updateSold(row.key, { color: v })}
                        placeholder="PRETA"
                      />
                      <Field
                        label="Combustível"
                        value={row.fuel}
                        onChange={(v) => updateSold(row.key, { fuel: v })}
                        placeholder="FLEX"
                      />
                      <Field
                        label="KM"
                        value={row.km}
                        onChange={(v) => updateSold(row.key, { km: v })}
                        placeholder="112000"
                        type="number"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Veículos recebidos na troca — não existe na compra, onde a loja é
                quem paga; deixar a seção aqui permitiria digitar dados que o
                documento não imprime. */}
            {roles.hasTradeIns && (
            <Section
              icon={ArrowLeftRight}
              title="Veículos recebidos na troca"
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setTrades((rows) => [...rows, newTradeRow()])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              }
            >
              {trades.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Adicione se o comprador estiver entregando um ou mais veículos como parte do
                  pagamento.
                </p>
              ) : (
                <div className="space-y-4">
                  {trades.map((row, index) => (
                    <div
                      key={row.key}
                      className="space-y-3 rounded-md border border-dashed border-border p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Recebido {index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setTrades((rows) => rows.filter((r) => r.key !== row.key))}
                          aria-label={`Remover veículo recebido ${index + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          label="Marca/Modelo"
                          value={row.brand_model}
                          onChange={(v) => updateTrade(row.key, { brand_model: v })}
                          placeholder="MARCA/MODELO DO VEÍCULO RECEBIDO"
                          className="sm:col-span-2"
                        />
                        <Field
                          label="Placa"
                          value={row.plate}
                          onChange={(v) => updateTrade(row.key, { plate: v })}
                          placeholder="PLACA DO VEÍCULO RECEBIDO"
                        />
                        <Field
                          label="Renavam"
                          value={row.renavam}
                          onChange={(v) => updateTrade(row.key, { renavam: v })}
                          placeholder="RENAVAN DO VEÍCULO RECEBIDO"
                        />
                        <Field
                          label="Chassi"
                          value={row.chassis}
                          onChange={(v) => updateTrade(row.key, { chassis: v })}
                          placeholder="CHASSI DO VEÍCULO RECEBIDO"
                        />
                        <Field
                          label="Cor"
                          value={row.color}
                          onChange={(v) => updateTrade(row.key, { color: v })}
                          placeholder="COR"
                        />
                        <Field
                          label="Ano"
                          value={row.year}
                          onChange={(v) => updateTrade(row.key, { year: v })}
                          placeholder="FABRICAÇÃO/MODELO"
                        />
                        <Field
                          label="Combustível"
                          value={row.fuel}
                          onChange={(v) => updateTrade(row.key, { fuel: v })}
                          placeholder="FLEX/DIESEL/GASOLINA"
                        />
                        <Field
                          label="KM"
                          value={row.km}
                          onChange={(v) => updateTrade(row.key, { km: v })}
                          placeholder="00000"
                          type="number"
                          className="sm:col-span-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
            )}

            {/* Negociação — no sinal os campos são outros: valor da entrada e
                valor total do veículo, sem a "forma de negociação" das vendas. */}
            <Section icon={HandCoins} title="Negociação">
              {roles.isSignal ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Valor do sinal (R$)"
                    value={signalValue}
                    onChange={setSignalValue}
                    placeholder="VALOR DEIXADO DE SINAL"
                    type="number"
                    required
                  />
                  <Field
                    label="Valor total do veículo (R$)"
                    value={saleValue}
                    onChange={setSaleValue}
                    placeholder="VALOR PELO QUAL A LOJA ESTÁ VENDENDO"
                    type="number"
                    required
                  />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Forma de negociação"
                    value={summary}
                    onChange={setSummary}
                    placeholder="NEGOCIAÇÃO (AVISTA + FINANCIAMENTO)"
                    required
                  />
                  <Field
                    label="Valor total (R$)"
                    value={totalValue}
                    onChange={setTotalValue}
                    placeholder="VALOR DA VENDA"
                    type="number"
                    required
                  />
                </div>
              )}

              <AreaField
                label="Observações"
                value={observations}
                onChange={setObservations}
                placeholder={
                  roles.isSignal
                    ? 'Detalhes adicionais sobre o sinal, se necessário...'
                    : '**R$ [VALOR] VIA PIX + [VEÍCULO/ENTRADA] + R$ [VALOR] EM [Nº]X DE R$ [VALOR] NO BOLETO BANCÁRIO...'
                }
                hint={
                  roles.isSignal
                    ? undefined
                    : 'Aparece no contrato como OBS, logo abaixo do valor. Detalhe entradas, parcelas, descontos e prazos.'
                }
                rows={roles.isSignal ? 3 : 5}
              />
            </Section>

            {/* Entrega — no sinal essa seção passa a ser o prazo para o cliente
                concretizar a compra ("Finalização da Negociação"), sem caixa de
                garantia: o sinal não promete cobertura nenhuma de motor/câmbio. */}
            <Section icon={FileText} title={roles.isSignal ? 'Finalização da Negociação' : 'Entrega'}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={roles.isSignal ? 'Data para finalizar' : 'Data de entrega'}
                  value={deliveryDate}
                  onChange={setDeliveryDate}
                  type="date"
                  required={roles.isSignal}
                />
                <Field
                  label={roles.isSignal ? 'Horário para finalizar' : 'Hora de entrega'}
                  value={deliveryTime}
                  onChange={setDeliveryTime}
                  type="time"
                />
              </div>
              {!roles.isSignal &&
                (roles.hasWarranty ? (
                  <div className="flex items-start gap-2 rounded-md bg-muted/60 p-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Garantia fixa de {SALE_WARRANTY.days} dias ou{' '}
                      {SALE_WARRANTY.km.toLocaleString('pt-BR')} KM (o que ocorrer primeiro), já
                      incluída na cláusula F do contrato.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-md bg-muted/60 p-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {isPurchase
                        ? 'Compra sem garantia da loja: quem vende é o cliente.'
                        : 'Repasse sem nenhuma garantia da loja, conforme a última cláusula do contrato.'}
                    </p>
                  </div>
                ))}
            </Section>

            {/* Dados do contrato e da loja */}
            <Section icon={FileSignature} title="Loja e assinatura">
              <Field
                label="Endereço no cabeçalho do contrato"
                value={storeAddress}
                onChange={setStoreAddress}
                placeholder="AVENIDA: Américo Barreira, 5626 Demócrito Rocha Fortaleza CE CEP: 60.440-092"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Cidade (local de assinatura)"
                  value={storeCity}
                  onChange={setStoreCity}
                  placeholder="FORTALEZA"
                />
                <Field label="Data do contrato" value={contractDate} onChange={setContractDate} type="date" />
              </div>
              <Field
                label={storeSignerLabel}
                value={sellerName}
                onChange={setSellerName}
                placeholder="MAURO SERGIO RIBEIRO DE SOUSA"
                required
                hint="Salvo automaticamente para os próximos contratos."
              />
            </Section>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handlePreview}
                disabled={isPreviewing}
                className="gap-2"
              >
                {isPreviewing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                Visualizar prévia
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSignature className="h-4 w-4" />
                )}
                {isEditing ? 'Salvar alterações' : 'Gerar contrato'}
              </Button>
            </div>
          </form>
        )}
        </DialogContent>
      </Dialog>

      {/* Confirmação ao sair com o formulário preenchido. Fica fora do Dialog
          para os dois não disputarem o mesmo focus trap do Radix. */}
      <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem finalizar o contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              O contrato ainda não foi finalizado. Você pode salvar o que já preencheu e continuar
              depois pela edição, ou descartar tudo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel disabled={isSaving}>Continuar preenchendo</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={closeNow}
              disabled={isSaving}
              className="sm:mt-0"
            >
              Descartar
            </Button>
            <AlertDialogAction
              onClick={(event) => {
                // Sem isso o Radix fecharia o alerta antes de a gravação terminar
                event.preventDefault()
                void handleSaveDraft()
              }}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Sim, salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
