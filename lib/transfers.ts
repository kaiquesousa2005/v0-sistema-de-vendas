import { mutate } from 'swr'

export type TransferStatus = 'nao_transferido' | 'em_processo' | 'concluido'

export type Transfer = {
  id: number
  vehicle_id: number
  status: TransferStatus
  dut_done: boolean
  notes: string | null
  dut_done_at: string | null
  inspection_at: string | null
  completed_at: string | null
  created_at: string
  plate: string
  brand: string
  model: string
  version: string | null
  model_year: number | null
  color: string | null
  vehicle_status: string
}

export type TransferPage = { items: Transfer[]; hasMore: boolean }
export type TransferSummary = Record<TransferStatus, number>

export async function jsonFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Erro ao carregar dados')
  return data as T
}

export async function sendJson(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a ação')
  return data
}

export function revalidateTransfers() {
  return mutate((key) => {
    const value = Array.isArray(key) ? key[0] : key
    return typeof value === 'string' && value.includes('/api/transfers')
  })
}

/** Formata 'YYYY-MM-DDTHH:MM' sem conversão de fuso horário. */
export function formatDateTime(value: string | null) {
  if (!value) return ''
  const [date, time] = value.split('T')
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}${time ? ` às ${time}` : ''}`
}

export function formatDate(value: string | null) {
  if (!value) return ''
  const [y, m, d] = value.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

export function todaySaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

export function vehicleTitle(t: Pick<Transfer, 'brand' | 'model'>) {
  return [t.brand, t.model].filter(Boolean).join(' ')
}
