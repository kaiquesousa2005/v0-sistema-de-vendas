export const CONTRACT_TYPES = {
  venda: {
    label: 'Contrato de Venda',
    short: 'Venda',
    prefix: 'VND',
    title: 'CONTRATO DE VENDA DE VEICULOS',
    description: 'Venda de veículo ao cliente, com negociação, garantia e entrega.',
    available: true,
  },
  devolucao: {
    label: 'Contrato de Devolução',
    short: 'Devolução',
    prefix: 'DEV',
    title: 'CONTRATO DE DEVOLUÇÃO DE VEICULO',
    description: 'Devolução de veículo por parte do comprador.',
    available: false,
  },
  repasse: {
    label: 'Contrato de Repasse',
    short: 'Repasse',
    prefix: 'REP',
    title: 'CONTRATO DE REPASSE DE VEICULO',
    description: 'Repasse do veículo para outra loja ou revendedor.',
    available: false,
  },
  consignacao: {
    label: 'Contrato de Consignação',
    short: 'Consignação',
    prefix: 'CSG',
    title: 'CONTRATO DE CONSIGNAÇÃO DE VEICULO',
    description: 'Veículo deixado na loja para venda em consignação.',
    available: false,
  },
  sinal: {
    label: 'Contrato de Sinal de Compra',
    short: 'Sinal',
    prefix: 'SIN',
    title: 'CONTRATO DE SINAL DE COMPRA DE VEICULO',
    description: 'Reserva do veículo mediante pagamento de sinal.',
    available: false,
  },
} as const

export type ContractType = keyof typeof CONTRACT_TYPES

export const CONTRACT_TYPE_KEYS = Object.keys(CONTRACT_TYPES) as ContractType[]

export function isContractType(value: string): value is ContractType {
  return Object.prototype.hasOwnProperty.call(CONTRACT_TYPES, value)
}

/* ---------- Snapshot armazenado em contracts.data ---------- */

export interface ContractParty {
  name: string
  cpf: string
  rg: string
  phone: string
  birth_date: string
  address: string
}

export interface ContractVehicle {
  brand_model: string
  renavam: string
  plate: string
  chassis: string
  color: string
  year: string
  fuel: string
}

export interface ContractStore {
  name: string
  address: string
  city: string
  seller_name: string
}

export interface SaleContractData {
  buyer: ContractParty
  vehicle: ContractVehicle
  /** Veículo recebido como parte do pagamento (troca). */
  trade_in: ContractVehicle | null
  negotiation: {
    /** Ex.: "AVISTA + CARRO + BOLETO" */
    summary: string
    total_value: number
    observations: string
  }
  delivery: {
    date: string
    time: string
  }
  /** KM que o veículo tem ao sair da loja. */
  exit_km: string
  warranty: {
    days: number
    km: number
  }
  store: ContractStore
}

/* ---------- Formatação ---------- */

const MONTHS_PT = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
]

/**
 * Normaliza para "AAAA-MM-DD".
 *
 * Colunas `date`/`timestamp` voltam do driver do Neon como objeto Date, e
 * `String(new Date(...))` produz "Thu May 10 1990 ..." — que não é ISO e
 * inclusive começa com "T", quebrando qualquer `split('T')`. Por isso o Date
 * é convertido usando os componentes UTC, sem passar por texto.
 */
export function toIsoDate(value: string | Date | null | undefined): string {
  if (!value) return ''
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const y = value.getUTCFullYear()
    const m = String(value.getUTCMonth() + 1).padStart(2, '0')
    const d = String(value.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(value).split('T')[0]
}

/** Quebra "AAAA-MM-DD" em partes numéricas, sem deslocamento de fuso. */
function dateParts(value: string | Date | null | undefined) {
  const [y, m, d] = toIsoDate(value).split('-').map(Number)
  if (!y || !m || !d || m < 1 || m > 12) return null
  return { y, m, d }
}

/**
 * Converte "2026-08-06" em "06 DE AGOSTO DE 2026".
 * Faz o parse manual da string para não sofrer deslocamento de fuso horário.
 */
export function longDatePt(iso: string | Date | null | undefined): string {
  const p = dateParts(iso)
  if (!p) return ''
  return `${String(p.d).padStart(2, '0')} DE ${MONTHS_PT[p.m - 1]} DE ${p.y}`
}

/** Converte "2026-08-06" em "06/08/2026". */
export function shortDatePt(iso: string | Date | null | undefined): string {
  const p = dateParts(iso)
  if (!p) return ''
  return `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}/${p.y}`
}

export function formatCurrency(value: number | string | null | undefined): string {
  const n = Number(value) || 0
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatCpf(cpf: string | null | undefined): string {
  const d = String(cpf ?? '').replace(/\D/g, '')
  if (d.length !== 11) return String(cpf ?? '')
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function formatPhone(phone: string | null | undefined): string {
  const d = String(phone ?? '').replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return String(phone ?? '')
}

export function formatCep(cep: string | null | undefined): string {
  const d = String(cep ?? '').replace(/\D/g, '')
  if (d.length !== 8) return String(cep ?? '')
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export function formatKm(km: string | number | null | undefined): string {
  const d = String(km ?? '').replace(/\D/g, '')
  if (!d) return 'NÃO DEFINIDO'
  return Number(d).toLocaleString('pt-BR')
}

/** Monta o endereço completo do cliente em uma linha. */
export function buildCustomerAddress(c: {
  address_street?: string | null
  address_number?: string | null
  address_complement?: string | null
  address_neighborhood?: string | null
  address_city?: string | null
  address_state?: string | null
  address_zip?: string | null
}): string {
  const parts: string[] = []
  const street = [c.address_street, c.address_number].filter(Boolean).join(', ')
  if (street) parts.push(street)
  if (c.address_complement) parts.push(c.address_complement)
  if (c.address_neighborhood) parts.push(c.address_neighborhood)

  const cityState = [c.address_city, c.address_state].filter(Boolean).join(' - ')
  if (cityState) parts.push(cityState)
  if (c.address_zip) parts.push(`CEP ${formatCep(c.address_zip)}`)

  return parts.join(', ').toUpperCase()
}

/** Monta o rótulo do veículo usado nas listagens. */
export function buildVehicleLabel(v: {
  brand?: string | null
  model?: string | null
  version?: string | null
  plate?: string | null
}): string {
  const name = [v.brand, v.model, v.version].filter(Boolean).join(' ')
  return v.plate ? `${name} (${v.plate})` : name
}
