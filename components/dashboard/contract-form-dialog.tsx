'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EntityPicker, type PickerItem } from '@/components/dashboard/entity-picker'
import { CONTRACT_TYPES, CONTRACT_TYPE_KEYS, type ContractType } from '@/lib/contracts'
import {
  ArrowLeft,
  ArrowLeftRight,
  Car,
  FileSignature,
  FileText,
  HandCoins,
  Loader2,
  Lock,
  Repeat,
  Undo2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

const TYPE_ICONS: Record<ContractType, typeof FileText> = {
  venda: FileSignature,
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

const emptyTradeIn = {
  brand_model: '',
  renavam: '',
  plate: '',
  chassis: '',
  color: '',
  year: '',
  fuel: '',
}

function todayIso() {
  // en-CA formata como YYYY-MM-DD respeitando o fuso local
  return new Date().toLocaleDateString('en-CA')
}

interface ContractFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (contractId: number) => void
}

export function ContractFormDialog({ open, onOpenChange, onCreated }: ContractFormDialogProps) {
  const [step, setStep] = useState<'type' | 'form'>('type')
  const [type, setType] = useState<ContractType>('venda')
  const [isSaving, setIsSaving] = useState(false)

  const [customer, setCustomer] = useState<PickerItem | null>(null)
  const [vehicle, setVehicle] = useState<PickerItem | null>(null)
  const vehicleCache = useRef<Map<number, RawVehicle>>(new Map())

  const [color, setColor] = useState('')
  const [fuel, setFuel] = useState('')
  const [exitKm, setExitKm] = useState('')

  const [hasTradeIn, setHasTradeIn] = useState(false)
  const [tradeIn, setTradeIn] = useState({ ...emptyTradeIn })

  const [summary, setSummary] = useState('')
  const [totalValue, setTotalValue] = useState('')
  const [observations, setObservations] = useState('')

  const [contractDate, setContractDate] = useState(todayIso())
  const [deliveryDate, setDeliveryDate] = useState(todayIso())
  const [deliveryTime, setDeliveryTime] = useState('')

  const [warrantyDays, setWarrantyDays] = useState('90')
  const [warrantyKm, setWarrantyKm] = useState('5000')

  const [storeAddress, setStoreAddress] = useState('')
  const [storeCity, setStoreCity] = useState('')
  const [sellerName, setSellerName] = useState('')

  const resetForm = useCallback(() => {
    setStep('type')
    setType('venda')
    setCustomer(null)
    setVehicle(null)
    setColor('')
    setFuel('')
    setExitKm('')
    setHasTradeIn(false)
    setTradeIn({ ...emptyTradeIn })
    setSummary('')
    setTotalValue('')
    setObservations('')
    setContractDate(todayIso())
    setDeliveryDate(todayIso())
    setDeliveryTime('')
    setWarrantyDays('90')
    setWarrantyKm('5000')
  }, [])

  // Pré-carrega os dados da loja para o cabeçalho e a assinatura
  useEffect(() => {
    if (!open) return
    let cancelled = false

    fetch('/api/store/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setStoreAddress(data.address ?? '')
        setStoreCity(data.city ?? '')
        setSellerName(data.seller_name ?? '')
      })
      .catch((error) => console.error('[v0] store profile error:', error))

    return () => {
      cancelled = true
    }
  }, [open])

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

  // Ao escolher o veículo, pré-preenche cor, combustível e KM do cadastro
  const handleVehicleChange = (item: PickerItem) => {
    setVehicle(item)
    const raw = vehicleCache.current.get(item.id)
    if (raw) {
      setColor(raw.color ?? '')
      setFuel(raw.fuel ?? '')
      setExitKm(raw.km != null ? String(raw.km) : '')
    }
  }

  const handleSelectType = (key: ContractType) => {
    if (!CONTRACT_TYPES[key].available) {
      toast.info(`${CONTRACT_TYPES[key].label} ainda não está disponível.`)
      return
    }
    setType(key)
    setStep('form')
  }

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customer) {
      toast.error('Selecione o comprador')
      return
    }
    if (!vehicle) {
      toast.error('Selecione o veículo')
      return
    }
    if (!summary.trim()) {
      toast.error('Descreva a forma de negociação')
      return
    }
    if (!sellerName.trim()) {
      toast.error('Informe o nome do vendedor')
      return
    }
    if (hasTradeIn && !tradeIn.brand_model.trim()) {
      toast.error('Informe a marca/modelo do veículo recebido na troca')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'venda',
          customer_id: customer.id,
          vehicle_id: vehicle.id,
          contract_date: contractDate,
          vehicle_overrides: { color, fuel },
          trade_in: hasTradeIn ? tradeIn : null,
          negotiation: {
            summary,
            total_value: Number(totalValue) || 0,
            observations,
          },
          delivery: { date: deliveryDate, time: deliveryTime },
          exit_km: exitKm,
          warranty: {
            days: Number(warrantyDays) || 90,
            km: Number(warrantyKm) || 5000,
          },
          store: { address: storeAddress, city: storeCity, seller_name: sellerName },
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Erro ao criar contrato')
        return
      }

      toast.success(`Contrato ${data.contract_number} criado`)
      handleClose(false)
      onCreated(Number(data.id))
    } catch (error) {
      console.error('[v0] create contract error:', error)
      toast.error('Erro de conexão ao criar contrato')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {step === 'type' ? (
          <>
            <DialogHeader>
              <DialogTitle>Novo contrato</DialogTitle>
              <DialogDescription>Escolha o tipo de contrato que deseja gerar.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              {CONTRACT_TYPE_KEYS.map((key) => {
                const cfg = CONTRACT_TYPES[key]
                const Icon = TYPE_ICONS[key]
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
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
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
                {CONTRACT_TYPES[type].label}
              </DialogTitle>
              <DialogDescription>
                Os dados do comprador e do veículo vêm do cadastro. Complete a negociação abaixo.
              </DialogDescription>
            </DialogHeader>

            {/* Comprador */}
            <Section icon={User} title="Comprador">
              <EntityPicker
                value={customer}
                onChange={setCustomer}
                fetcher={fetchCustomers}
                placeholder="Selecionar cliente cadastrado"
                searchPlaceholder="Buscar por nome, CPF ou telefone..."
                emptyText="Nenhum cliente encontrado."
              />
            </Section>

            {/* Veículo */}
            <Section icon={Car} title="Veículo vendido">
              <EntityPicker
                value={vehicle}
                onChange={handleVehicleChange}
                fetcher={fetchVehicles}
                placeholder="Selecionar veículo em estoque"
                searchPlaceholder="Buscar por placa, marca ou modelo..."
                emptyText="Nenhum veículo encontrado."
              />

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Cor" value={color} onChange={setColor} placeholder="PRETA" />
                <Field label="Combustível" value={fuel} onChange={setFuel} placeholder="FLEX" />
                <Field
                  label="KM de saída"
                  value={exitKm}
                  onChange={setExitKm}
                  placeholder="112000"
                  type="number"
                />
              </div>
            </Section>

            {/* Veículo recebido na troca */}
            <Section
              icon={ArrowLeftRight}
              title="Veículo recebido na troca"
              action={
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {hasTradeIn ? 'Incluído' : 'Não incluído'}
                  </span>
                  <Switch checked={hasTradeIn} onCheckedChange={setHasTradeIn} />
                </div>
              }
            >
              {hasTradeIn ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Marca/Modelo"
                    value={tradeIn.brand_model}
                    onChange={(v) => setTradeIn((p) => ({ ...p, brand_model: v }))}
                    placeholder="VW SAVEIRO CD 1.6"
                    required
                    className="sm:col-span-2"
                  />
                  <Field
                    label="Placa"
                    value={tradeIn.plate}
                    onChange={(v) => setTradeIn((p) => ({ ...p, plate: v }))}
                    placeholder="PMW2J33"
                  />
                  <Field
                    label="Renavam"
                    value={tradeIn.renavam}
                    onChange={(v) => setTradeIn((p) => ({ ...p, renavam: v }))}
                    placeholder="01151711460"
                  />
                  <Field
                    label="Chassi"
                    value={tradeIn.chassis}
                    onChange={(v) => setTradeIn((p) => ({ ...p, chassis: v }))}
                    placeholder="9BWJB45U4JP091533"
                  />
                  <Field
                    label="Cor"
                    value={tradeIn.color}
                    onChange={(v) => setTradeIn((p) => ({ ...p, color: v }))}
                    placeholder="BRANCA"
                  />
                  <Field
                    label="Ano"
                    value={tradeIn.year}
                    onChange={(v) => setTradeIn((p) => ({ ...p, year: v }))}
                    placeholder="2018/2018"
                  />
                  <Field
                    label="Combustível"
                    value={tradeIn.fuel}
                    onChange={(v) => setTradeIn((p) => ({ ...p, fuel: v }))}
                    placeholder="FLEX"
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Ative se o comprador estiver entregando um veículo como parte do pagamento.
                </p>
              )}
            </Section>

            {/* Negociação */}
            <Section icon={HandCoins} title="Negociação">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Forma de negociação"
                  value={summary}
                  onChange={setSummary}
                  placeholder="AVISTA + CARRO + BOLETO"
                  required
                />
                <Field
                  label="Valor total (R$)"
                  value={totalValue}
                  onChange={setTotalValue}
                  placeholder="61800.00"
                  type="number"
                  required
                />
              </div>

              <AreaField
                label="Observações da negociação"
                value={observations}
                onChange={setObservations}
                placeholder="RECEBENDO 1.800,00 NO PIX DA LOJA + RECEBENDO O SAVEIRO 35.000,00 + 25.000,00 NO BOLETO BANCARIO EM 24X 1.500,00..."
                hint="Aparece no contrato como OBS, logo abaixo do valor. Detalhe entradas, parcelas, descontos e prazos."
                rows={5}
              />
            </Section>

            {/* Entrega e garantia */}
            <Section icon={FileText} title="Entrega e garantia">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Data de entrega"
                  value={deliveryDate}
                  onChange={setDeliveryDate}
                  type="date"
                />
                <Field
                  label="Hora de entrega"
                  value={deliveryTime}
                  onChange={setDeliveryTime}
                  type="time"
                />
                <Field
                  label="Garantia (dias)"
                  value={warrantyDays}
                  onChange={setWarrantyDays}
                  type="number"
                />
                <Field
                  label="Garantia (KM)"
                  value={warrantyKm}
                  onChange={setWarrantyKm}
                  type="number"
                />
              </div>
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
                label="Nome do vendedor"
                value={sellerName}
                onChange={setSellerName}
                placeholder="MAURO SERGIO RIBEIRO DE SOUSA"
                required
                hint="Salvo automaticamente para os próximos contratos."
              />
            </Section>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSignature className="h-4 w-4" />
                )}
                Gerar contrato
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
