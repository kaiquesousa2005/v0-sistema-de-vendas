import { neon } from '@neondatabase/serverless'
import { z } from 'zod'
import {
  buildCustomerAddress,
  buildVehicleLabel,
  toIsoDate,
  type ContractVehicle,
  type SaleContractData,
} from '@/lib/contracts'

/** `neon()` retorna NeonQueryFunction<false, false>; manter os genéricos
    exatos evita incompatibilidade nos call sites das rotas. */
type Sql = ReturnType<typeof neon<false, false>>

/** Veículo digitado manualmente (usado para os recebidos em troca). */
const manualVehicleSchema = z.object({
  brand_model: z.string().trim().default(''),
  renavam: z.string().trim().default(''),
  plate: z.string().trim().default(''),
  chassis: z.string().trim().default(''),
  color: z.string().trim().default(''),
  year: z.string().trim().default(''),
  fuel: z.string().trim().default(''),
  km: z.string().trim().default(''),
})

/** Veículo vendido: vem do estoque, com cor/combustível/KM ajustáveis. */
const soldVehicleSchema = z.object({
  vehicle_id: z.coerce.number().int().positive(),
  color: z.string().trim().default(''),
  fuel: z.string().trim().default(''),
  km: z.string().trim().default(''),
})

const baseFields = {
  type: z.enum(['venda', 'compra']).default('venda'),
  customer_id: z.coerce.number().int().positive(),
  vehicles: z.array(soldVehicleSchema),
  /**
   * Veículos do contrato digitados à mão, sem passar pelo estoque.
   *
   * Existe para a compra: o carro que a loja está comprando muitas vezes ainda
   * não foi cadastrado. No snapshot eles são mesclados em `vehicles`, então o
   * documento não precisa saber de onde cada veículo veio.
   */
  manual_vehicles: z.array(manualVehicleSchema).default([]),
  trade_ins: z.array(manualVehicleSchema).default([]),
  contract_date: z.string().trim().default(''),

  negotiation: z.object({
    summary: z.string().trim().default(''),
    total_value: z.coerce.number().nonnegative().default(0),
    observations: z.string().trim().default(''),
  }),

  delivery: z.object({
    date: z.string().trim().default(''),
    time: z.string().trim().default(''),
  }),

  store: z.object({
    address: z.string().trim().default(''),
    city: z.string().trim().default(''),
    seller_name: z.string().trim().default(''),
  }),
}

/** Salvar exige cliente, veículo, negociação e vendedor. */
export const saleSchema = z
  .object({
    ...baseFields,
    customer_id: z.coerce.number().int().positive('Selecione o cliente'),
    contract_date: z.string().min(10, 'Data do contrato obrigatória'),
    negotiation: z.object({
      summary: z.string().trim().min(1, 'Descreva a forma de negociação'),
      total_value: z.coerce.number().nonnegative('Valor inválido'),
      observations: z.string().trim().default(''),
    }),
    store: z.object({
      address: z.string().trim().default(''),
      city: z.string().trim().default(''),
      seller_name: z.string().trim().min(1, 'Informe o nome do vendedor'),
    }),
  })
  // Checagem cruzada em vez de `vehicles.min(1)`: na compra o veículo pode vir
  // do estoque OU ser digitado, e exigir a lista do estoque bloquearia o
  // preenchimento manual.
  .superRefine((value, ctx) => {
    const hasVehicle = value.vehicles.length > 0 || value.manual_vehicles.length > 0
    if (!hasVehicle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['vehicles'],
        message: 'Informe ao menos um veículo',
      })
    }
  })

/**
 * A prévia roda com o formulário pela metade, então tudo é opcional:
 * nenhum campo em branco pode derrubar a visualização.
 */
export const salePreviewSchema = z.object({
  ...baseFields,
  customer_id: z.coerce.number().int().positive().nullable().default(null),
  vehicles: z.array(soldVehicleSchema).default([]),
  negotiation: baseFields.negotiation.partial().default({}),
  delivery: baseFields.delivery.partial().default({}),
  store: baseFields.store.partial().default({}),
})

/**
 * Rascunho gravável: as mesmas regras frouxas da prévia, mas o resultado vai
 * para o banco. É o schema usado quando o usuário fecha o modal no meio do
 * preenchimento e escolhe salvar o que já digitou.
 *
 * Nenhum campo é obrigatório aqui de propósito — a validação "de verdade"
 * continua no `saleSchema`, aplicada quando o contrato é finalizado.
 */
export const saleDraftSchema = salePreviewSchema

export type SaleInput = z.infer<typeof saleSchema>
export type SalePreviewInput = z.infer<typeof salePreviewSchema>

const EMPTY_PARTY = { name: '', cpf: '', rg: '', phone: '', birth_date: '', address: '' }

type ManualVehicleInput = z.infer<typeof manualVehicleSchema>

/**
 * Converte veículos digitados à mão para o formato do snapshot.
 *
 * Linhas totalmente em branco são descartadas: o formulário adiciona a linha
 * antes de o usuário digitar, e uma linha vazia viraria um bloco fantasma no
 * documento impresso.
 */
function mapManualVehicles(rows: ManualVehicleInput[] | undefined): ContractVehicle[] {
  return (rows ?? [])
    .filter((t) => Object.values(t).some((value) => String(value ?? '').trim() !== ''))
    .map((t) => ({
      vehicle_id: null,
      brand_model: t.brand_model.toUpperCase(),
      renavam: t.renavam,
      plate: t.plate.toUpperCase(),
      chassis: t.chassis.toUpperCase(),
      color: t.color.toUpperCase(),
      year: t.year,
      fuel: t.fuel.toUpperCase(),
      km: t.km,
    }))
}

export interface BuiltSnapshot {
  snapshot: SaleContractData
  customerName: string
  vehicleLabel: string
  vehicleIds: number[]
}

/**
 * Monta o snapshot do contrato lendo cliente, veículos e loja do banco —
 * a fonte da verdade — sempre restrito à loja da sessão.
 *
 * Aceita entrada parcial (prévia): o que não existir vira bloco vazio em vez
 * de erro. Retorna `null` em `customer`/`vehicles` faltantes só na prévia,
 * porque o schema de gravação já exige esses campos.
 */
export async function buildSaleSnapshot(
  sql: Sql,
  storeId: number,
  data: SaleInput | SalePreviewInput,
): Promise<BuiltSnapshot> {
  const vehicleIds = data.vehicles.map((v) => v.vehicle_id)

  const [customerRows, vehicleRows, storeRows] = await Promise.all([
    data.customer_id
      ? sql`
          SELECT full_name, birth_date, phone, rg, cpf,
                 address_street, address_number, address_complement,
                 address_neighborhood, address_city, address_state, address_zip
          FROM customers
          WHERE id = ${data.customer_id} AND store_id = ${storeId}
        `
      : Promise.resolve([] as Record<string, unknown>[]),
    vehicleIds.length > 0
      ? sql`
          SELECT id, brand, model, version, plate, chassis, renavam,
                 manufacture_year, model_year, color, fuel, km
          FROM vehicles
          WHERE id = ANY(${vehicleIds}::int[]) AND store_id = ${storeId}
        `
      : Promise.resolve([] as Record<string, unknown>[]),
    sql`SELECT store_name, trade_name, address, city, seller_name FROM stores WHERE id = ${storeId}`,
  ])

  const customer = customerRows[0] ?? null
  const store = storeRows[0] ?? {}
  const byId = new Map(vehicleRows.map((v) => [Number(v.id), v]))

  // Mantém a ordem escolhida no formulário e ignora ids de outra loja
  const soldVehicles: ContractVehicle[] = data.vehicles.flatMap((input) => {
    const v = byId.get(input.vehicle_id)
    if (!v) return []
    return [
      {
        vehicle_id: Number(v.id),
        brand_model: [v.brand, v.model, v.version].filter(Boolean).join(' ').toUpperCase(),
        renavam: String(v.renavam ?? ''),
        plate: String(v.plate ?? '').toUpperCase(),
        chassis: String(v.chassis ?? '').toUpperCase(),
        color: (input.color || String(v.color ?? '')).toUpperCase(),
        year: `${v.manufacture_year ?? ''}/${v.model_year ?? ''}`,
        fuel: (input.fuel || String(v.fuel ?? '')).toUpperCase(),
        km: input.km || (v.km != null ? String(v.km) : ''),
      },
    ]
  })

  const tradeIns = mapManualVehicles(data.trade_ins)

  // Veículos digitados à mão entram na mesma lista dos que vieram do estoque.
  // Ficam depois dos selecionados para o primeiro veículo (o que nomeia o
  // contrato) continuar sendo o escolhido no formulário quando houver os dois.
  const allVehicles: ContractVehicle[] = [
    ...soldVehicles,
    ...mapManualVehicles((data as { manual_vehicles?: ManualVehicleInput[] }).manual_vehicles),
  ]

  const snapshot: SaleContractData = {
    buyer: customer
      ? {
          name: String(customer.full_name ?? '').toUpperCase(),
          cpf: String(customer.cpf ?? ''),
          rg: String(customer.rg ?? ''),
          phone: String(customer.phone ?? ''),
          birth_date: toIsoDate(customer.birth_date as string | Date | null),
          address: buildCustomerAddress(customer),
        }
      : { ...EMPTY_PARTY },
    vehicles: allVehicles,
    trade_ins: tradeIns,
    negotiation: {
      summary: (data.negotiation?.summary ?? '').toUpperCase(),
      total_value: Number(data.negotiation?.total_value) || 0,
      observations: (data.negotiation?.observations ?? '').toUpperCase(),
    },
    delivery: {
      date: data.delivery?.date ?? '',
      time: data.delivery?.time ?? '',
    },
    store: {
      // `trade_name` (nome fantasia) é o nome citado nas cláusulas de garantia
      name: String(store.trade_name || store.store_name || '').toUpperCase(),
      address: data.store?.address || String(store.address ?? ''),
      city: (data.store?.city || String(store.city ?? '')).toUpperCase(),
      seller_name: (data.store?.seller_name ?? '').toUpperCase(),
    },
  }

  // O rótulo da listagem sai da lista combinada: numa compra com veículo
  // digitado não há registro no estoque, e ainda assim o card precisa de nome.
  const primary = allVehicles[0]
  const extra = allVehicles.length > 1 ? ` +${allVehicles.length - 1}` : ''

  return {
    snapshot,
    customerName: snapshot.buyer.name,
    vehicleLabel: primary
      ? `${buildVehicleLabel({
          brand: primary.brand_model,
          plate: primary.plate,
        }).toUpperCase()}${extra}`
      : '',
    vehicleIds: soldVehicles.map((v) => Number(v.vehicle_id)),
  }
}

/**
 * Persiste os dados da loja para pré-preencher os próximos contratos.
 *
 * Campo vazio nunca sobrescreve o valor já guardado: salvar um rascunho no meio
 * do preenchimento não pode apagar o endereço/vendedor lembrados.
 */
export async function rememberStoreDefaults(
  sql: Sql,
  storeId: number,
  store: SaleContractData['store'],
) {
  await sql`
    UPDATE stores
    SET address = COALESCE(NULLIF(${store.address}, ''), address),
        city = COALESCE(NULLIF(${store.city}, ''), city),
        seller_name = COALESCE(NULLIF(${store.seller_name}, ''), seller_name)
    WHERE id = ${storeId}
  `
}
