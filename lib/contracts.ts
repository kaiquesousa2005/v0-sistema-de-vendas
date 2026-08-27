export const CONTRACT_TYPES = {
  venda: {
    label: 'Contrato de Venda',
    short: 'Venda',
    prefix: 'VND',
    title: 'CONTRATO DE VENDA DE VEICULOS',
    description: 'Venda de veículo ao cliente, com negociação, garantia e entrega.',
    available: true,
  },
  compra: {
    label: 'Contrato de Compra',
    short: 'Compra',
    prefix: 'CMP',
    title: 'CONTRATO DE COMPRA DE VEICULOS',
    description: 'Compra de veículo de um cliente, com pagamento e recebimento.',
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
    title: 'CONTRATO DE REPASSE DE VEICULOS',
    description: 'Venda de veículo abaixo do mercado, sem nenhuma garantia da loja.',
    available: true,
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

/** Tipos que já podem ser criados/gravados. */
export const AVAILABLE_CONTRACT_TYPES = CONTRACT_TYPE_KEYS.filter((k) => CONTRACT_TYPES[k].available)

/**
 * Papéis das partes e regras de conteúdo conforme o tipo de contrato.
 *
 * Na venda a loja é a VENDEDORA e o cliente é o COMPRADOR. Na compra os papéis
 * se invertem: a loja compra o veículo do cliente, que passa a ser o VENDEDOR.
 * O snapshot guarda o cliente sempre na mesma chave (`buyer`), então é este
 * mapa que decide os rótulos do documento e do formulário.
 *
 * Fonte única também das diferenças de conteúdo (garantia, troca, RG), para o
 * formulário não prometer algo que o documento impresso não traz.
 */
export function contractRoles(type: ContractType) {
  const storeIsBuyer = type === 'compra'
  return {
    /** Papel do cliente no contrato. */
    customer: storeIsBuyer ? 'VENDEDOR' : 'COMPRADOR',
    /** Papel da loja no contrato. */
    store: storeIsBuyer ? 'COMPRADOR' : 'VENDEDOR',
    storeIsBuyer,
    /**
     * Só a venda tem garantia de motor e câmbio. No repasse o carro sai abaixo
     * do valor de mercado justamente por não ter garantia, e na compra quem
     * vende é o cliente, que não assume garantia nenhuma.
     */
    hasWarranty: type === 'venda',
    /** Veículo dado como entrada só existe quando a loja é a vendedora. */
    hasTradeIns: !storeIsBuyer,
    /** Compra e repasse imprimem o RG do cliente, como nos recibos em papel. */
    showsRg: type === 'compra' || type === 'repasse',
  }
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
  /** Id do cadastro, quando o veículo veio do estoque (permite reeditar). */
  vehicle_id?: number | null
  brand_model: string
  renavam: string
  plate: string
  chassis: string
  color: string
  year: string
  fuel: string
  /** KM do veículo neste contrato. */
  km: string
}

export interface ContractStore {
  name: string
  address: string
  city: string
  seller_name: string
}

/**
 * Garantia do contrato de venda: fixa por regra da loja, não é editável.
 * Vale o que ocorrer primeiro entre prazo e quilometragem.
 */
export const SALE_WARRANTY = { days: 90, daysText: 'NOVENTA', km: 5000 } as const

/** Formato canônico usado pelo documento e pelo formulário. */
export interface SaleContractData {
  /**
   * A contraparte da loja — sempre o cliente cadastrado.
   *
   * A chave se chama `buyer` porque nasceu no contrato de venda e já existe em
   * snapshots gravados; no contrato de compra ela guarda o VENDEDOR. Use
   * `contractRoles(type)` para saber o rótulo correto em cada caso.
   */
  buyer: ContractParty
  /** Veículos objeto do contrato: vendidos ao cliente ou comprados dele. */
  vehicles: ContractVehicle[]
  /** Veículos recebidos como parte do pagamento (troca). */
  trade_ins: ContractVehicle[]
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
  store: ContractStore
}

/* ---------- Normalização ----------
   Contratos criados antes do suporte a múltiplos veículos guardaram
   `vehicle`/`trade_in` (objetos únicos) e `exit_km` no topo do snapshot.
   `normalizeSaleData` converte qualquer um dos formatos — e também dados
   parciais da prévia — para o formato canônico, sem lançar erro. */

function str(value: unknown): string {
  return value == null ? '' : String(value)
}

function normalizeVehicle(raw: unknown, fallbackKm = ''): ContractVehicle {
  const v = (raw ?? {}) as Record<string, unknown>
  const id = v.vehicle_id == null ? null : Number(v.vehicle_id) || null
  return {
    vehicle_id: id,
    brand_model: str(v.brand_model),
    renavam: str(v.renavam),
    plate: str(v.plate),
    chassis: str(v.chassis),
    color: str(v.color),
    year: str(v.year),
    fuel: str(v.fuel),
    km: str(v.km) || fallbackKm,
  }
}

export function normalizeSaleData(raw: unknown): SaleContractData {
  const d = (raw ?? {}) as Record<string, unknown>
  const legacyExitKm = str(d.exit_km)

  let vehicles = Array.isArray(d.vehicles) ? d.vehicles.map((v) => normalizeVehicle(v)) : []
  if (vehicles.length === 0 && d.vehicle) {
    // O KM antigo era único e representava o veículo vendido
    vehicles = [normalizeVehicle(d.vehicle, legacyExitKm)]
  }

  let tradeIns = Array.isArray(d.trade_ins) ? d.trade_ins.map((v) => normalizeVehicle(v)) : []
  if (tradeIns.length === 0 && d.trade_in) {
    tradeIns = [normalizeVehicle(d.trade_in)]
  }

  const buyer = (d.buyer ?? {}) as Record<string, unknown>
  const negotiation = (d.negotiation ?? {}) as Record<string, unknown>
  const delivery = (d.delivery ?? {}) as Record<string, unknown>
  const store = (d.store ?? {}) as Record<string, unknown>

  return {
    buyer: {
      name: str(buyer.name),
      cpf: str(buyer.cpf),
      rg: str(buyer.rg),
      phone: str(buyer.phone),
      birth_date: toIsoDate(buyer.birth_date as string | Date | null),
      address: str(buyer.address),
    },
    vehicles,
    trade_ins: tradeIns,
    negotiation: {
      summary: str(negotiation.summary),
      total_value: Number(negotiation.total_value) || 0,
      observations: str(negotiation.observations),
    },
    delivery: { date: str(delivery.date), time: str(delivery.time) },
    store: {
      name: str(store.name),
      address: str(store.address),
      city: str(store.city),
      seller_name: str(store.seller_name),
    },
  }
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

/** Data de hoje em "AAAA-MM-DD", no fuso local. */
export function todayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Campos essenciais ausentes num snapshot de contrato. Lista vazia = completo.
 *
 * Contratos podem ser gravados incompletos (quando o usuário sai do formulário
 * no meio e escolhe salvar), então a "incompletude" é derivada do próprio
 * snapshot em vez de guardada numa coluna: se depois ele preencher o que
 * faltava pela edição, o aviso desaparece sozinho, sem migração nem backfill.
 */
export function missingContractFields(data: unknown, type: ContractType = 'venda'): string[] {
  const d = normalizeSaleData(data)
  const roles = contractRoles(type)
  const missing: string[] = []

  // Rótulos seguem o papel de cada parte: numa compra o que falta é o
  // "Vendedor" (o cliente) e quem assina pela loja é o "Comprador".
  if (!d.buyer.name) missing.push(roles.storeIsBuyer ? 'Vendedor' : 'Comprador')
  if (d.vehicles.length === 0) missing.push('Veículo')
  if (!d.negotiation.summary) missing.push('Forma de negociação')
  if (!d.negotiation.total_value) missing.push('Valor')
  if (!d.store.seller_name) missing.push(roles.storeIsBuyer ? 'Comprador' : 'Vendedor')

  return missing
}

/** Nome do mês em maiúsculas, ex.: 8 -> "AGOSTO". */
export function monthNamePt(month: number): string {
  return MONTHS_PT[month - 1] ?? ''
}

export interface MonthGroup<T> {
  /** "2026-08" — inclui o ano para não misturar agostos de anos diferentes. */
  key: string
  /** "AGOSTO 2026" */
  label: string
  year: number
  month: number
  count: number
  totalValue: number
  items: T[]
}

/**
 * Agrupa contratos por ano+mês de `contract_date`.
 *
 * Preserva a ordem de entrada, então uma lista que já vem do banco ordenada por
 * data decrescente produz grupos do mês mais recente para o mais antigo.
 */
export function groupContractsByMonth<
  T extends { contract_date: string | Date; total_value: number },
>(rows: T[]): MonthGroup<T>[] {
  const groups = new Map<string, MonthGroup<T>>()

  for (const row of rows) {
    const p = dateParts(row.contract_date)
    if (!p) continue

    const key = `${p.y}-${String(p.m).padStart(2, '0')}`
    let group = groups.get(key)

    if (!group) {
      group = {
        key,
        label: `${monthNamePt(p.m)} ${p.y}`,
        year: p.y,
        month: p.m,
        count: 0,
        totalValue: 0,
        items: [],
      }
      groups.set(key, group)
    }

    group.items.push(row)
    group.count += 1
    group.totalValue += Number(row.total_value) || 0
  }

  return [...groups.values()]
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

/** Formata a quilometragem. Retorna string vazia quando não informada. */
export function formatKm(km: string | number | null | undefined): string {
  const d = String(km ?? '').replace(/\D/g, '')
  if (!d) return ''
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
