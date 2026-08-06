import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'
import { z } from 'zod'
import {
  CONTRACT_TYPES,
  buildCustomerAddress,
  buildVehicleLabel,
  toIsoDate,
  type SaleContractData,
} from '@/lib/contracts'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

async function getStoreId(request: NextRequest): Promise<number | null> {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, secret)
    return payload.storeId as number
  } catch {
    return null
  }
}

const vehicleSnapshotSchema = z.object({
  brand_model: z.string().trim().min(1, 'Marca/modelo obrigatório'),
  renavam: z.string().trim().default(''),
  plate: z.string().trim().default(''),
  chassis: z.string().trim().default(''),
  color: z.string().trim().default(''),
  year: z.string().trim().default(''),
  fuel: z.string().trim().default(''),
})

const saleSchema = z.object({
  type: z.literal('venda'),
  customer_id: z.coerce.number().int().positive('Selecione o comprador'),
  vehicle_id: z.coerce.number().int().positive('Selecione o veículo'),
  contract_date: z.string().min(10, 'Data do contrato obrigatória'),

  // Cor / combustível / ano podem não existir no cadastro do veículo,
  // por isso são enviados pelo formulário e sobrescrevem o snapshot.
  vehicle_overrides: z
    .object({
      color: z.string().trim().default(''),
      fuel: z.string().trim().default(''),
    })
    .default({ color: '', fuel: '' }),

  trade_in: vehicleSnapshotSchema.nullable().default(null),

  negotiation: z.object({
    summary: z.string().trim().min(1, 'Descreva a forma de negociação'),
    total_value: z.coerce.number().nonnegative('Valor inválido'),
    observations: z.string().trim().default(''),
  }),

  delivery: z.object({
    date: z.string().trim().default(''),
    time: z.string().trim().default(''),
  }),

  exit_km: z.string().trim().default(''),

  warranty: z
    .object({
      days: z.coerce.number().int().nonnegative().default(90),
      km: z.coerce.number().int().nonnegative().default(5000),
    })
    .default({ days: 90, km: 5000 }),

  store: z.object({
    address: z.string().trim().default(''),
    city: z.string().trim().default(''),
    seller_name: z.string().trim().min(1, 'Informe o nome do vendedor'),
  }),
})

export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const sp = request.nextUrl.searchParams

    const page = Math.max(1, Number.parseInt(sp.get('page') ?? '1') || 1)
    const limit = Math.min(50, Math.max(1, Number.parseInt(sp.get('limit') ?? '12') || 12))
    const offset = (page - 1) * limit

    const search = (sp.get('search') ?? '').trim()
    const like = `%${search}%`

    const typeParam = (sp.get('type') ?? '').trim()
    const type = Object.prototype.hasOwnProperty.call(CONTRACT_TYPES, typeParam) ? typeParam : ''

    const [countRows, contracts] = await Promise.all([
      sql`
        SELECT COUNT(*)::int AS total
        FROM contracts
        WHERE store_id = ${storeId}
          AND (${type} = '' OR type = ${type})
          AND (
            ${search} = ''
            OR customer_name ILIKE ${like}
            OR vehicle_label ILIKE ${like}
            OR contract_number ILIKE ${like}
          )
      `,
      sql`
        SELECT
          id, type, contract_number, customer_id, vehicle_id,
          customer_name, vehicle_label, total_value, contract_date, created_at
        FROM contracts
        WHERE store_id = ${storeId}
          AND (${type} = '' OR type = ${type})
          AND (
            ${search} = ''
            OR customer_name ILIKE ${like}
            OR vehicle_label ILIKE ${like}
            OR contract_number ILIKE ${like}
          )
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
    ])

    const total = Number(countRows[0]?.total ?? 0)

    return NextResponse.json({
      contracts: contracts.map((c) => ({
        ...c,
        total_value: Number(c.total_value) || 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    console.error('[v0] GET contracts error:', error)
    return NextResponse.json({ error: 'Erro ao buscar contratos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    if (body?.type && body.type !== 'venda') {
      const cfg = CONTRACT_TYPES[body.type as keyof typeof CONTRACT_TYPES]
      return NextResponse.json(
        { error: `${cfg?.label ?? 'Esse tipo de contrato'} ainda não está disponível.` },
        { status: 400 },
      )
    }

    const data = saleSchema.parse(body)
    const sql = neon(process.env.DATABASE_URL!)

    // Cliente e veículo são lidos do banco (fonte da verdade), sempre da própria loja
    const [customerRows, vehicleRows, storeRows] = await Promise.all([
      sql`
        SELECT full_name, birth_date, phone, rg, cpf,
               address_street, address_number, address_complement,
               address_neighborhood, address_city, address_state, address_zip
        FROM customers
        WHERE id = ${data.customer_id} AND store_id = ${storeId}
      `,
      sql`
        SELECT brand, model, version, plate, chassis, renavam,
               manufacture_year, model_year, color, fuel, km
        FROM vehicles
        WHERE id = ${data.vehicle_id} AND store_id = ${storeId}
      `,
      sql`SELECT store_name, trade_name, address, city, seller_name FROM stores WHERE id = ${storeId}`,
    ])

    if (customerRows.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }
    if (vehicleRows.length === 0) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
    }

    const customer = customerRows[0]
    const vehicle = vehicleRows[0]
    const store = storeRows[0] ?? {}

    const snapshot: SaleContractData = {
      buyer: {
        name: String(customer.full_name).toUpperCase(),
        cpf: String(customer.cpf ?? ''),
        rg: String(customer.rg ?? ''),
        phone: String(customer.phone ?? ''),
        birth_date: toIsoDate(customer.birth_date),
        address: buildCustomerAddress(customer),
      },
      vehicle: {
        brand_model: [vehicle.brand, vehicle.model, vehicle.version]
          .filter(Boolean)
          .join(' ')
          .toUpperCase(),
        renavam: String(vehicle.renavam ?? ''),
        plate: String(vehicle.plate ?? '').toUpperCase(),
        chassis: String(vehicle.chassis ?? '').toUpperCase(),
        color: (data.vehicle_overrides.color || vehicle.color || '').toUpperCase(),
        year: `${vehicle.manufacture_year ?? ''}/${vehicle.model_year ?? ''}`,
        fuel: (data.vehicle_overrides.fuel || vehicle.fuel || '').toUpperCase(),
      },
      trade_in: data.trade_in
        ? {
            brand_model: data.trade_in.brand_model.toUpperCase(),
            renavam: data.trade_in.renavam,
            plate: data.trade_in.plate.toUpperCase(),
            chassis: data.trade_in.chassis.toUpperCase(),
            color: data.trade_in.color.toUpperCase(),
            year: data.trade_in.year,
            fuel: data.trade_in.fuel.toUpperCase(),
          }
        : null,
      negotiation: {
        summary: data.negotiation.summary.toUpperCase(),
        total_value: data.negotiation.total_value,
        observations: data.negotiation.observations.toUpperCase(),
      },
      delivery: data.delivery,
      exit_km: data.exit_km || String(vehicle.km ?? ''),
      warranty: data.warranty,
      store: {
        // `trade_name` (nome fantasia) é o nome que aparece nas cláusulas de garantia
        name: String(store.trade_name || store.store_name || '').toUpperCase(),
        address: data.store.address || String(store.address ?? ''),
        city: (data.store.city || String(store.city ?? '')).toUpperCase(),
        seller_name: data.store.seller_name.toUpperCase(),
      },
    }

    // Guarda os dados da loja para pré-preencher os próximos contratos
    await sql`
      UPDATE stores
      SET address = ${snapshot.store.address || null},
          city = ${snapshot.store.city || null},
          seller_name = ${snapshot.store.seller_name || null}
      WHERE id = ${storeId}
    `

    const prefix = CONTRACT_TYPES.venda.prefix
    const customerName = String(customer.full_name).toUpperCase()
    const vehicleLabel = buildVehicleLabel(vehicle).toUpperCase()

    // Numeração sequencial por loja/tipo. Em caso de corrida no índice único,
    // tenta novamente com o próximo número.
    let created: Record<string, unknown> | null = null
    let lastError: unknown = null

    for (let attempt = 0; attempt < 5; attempt++) {
      const seqRows = await sql`
        SELECT COALESCE(MAX(NULLIF(regexp_replace(contract_number, '\\D', '', 'g'), '')::int), 0) AS last
        FROM contracts
        WHERE store_id = ${storeId} AND type = 'venda'
      `
      const next = Number(seqRows[0]?.last ?? 0) + 1 + attempt
      const contractNumber = `${prefix}-${String(next).padStart(4, '0')}`

      try {
        const rows = await sql`
          INSERT INTO contracts (
            store_id, type, contract_number, customer_id, vehicle_id,
            customer_name, vehicle_label, total_value, contract_date, data
          ) VALUES (
            ${storeId}, 'venda', ${contractNumber}, ${data.customer_id}, ${data.vehicle_id},
            ${customerName}, ${vehicleLabel}, ${data.negotiation.total_value},
            ${data.contract_date}, ${JSON.stringify(snapshot)}::jsonb
          )
          RETURNING id, type, contract_number, customer_name, vehicle_label, total_value, contract_date
        `
        created = rows[0]
        break
      } catch (err) {
        lastError = err
        const message = err instanceof Error ? err.message : ''
        if (!message.includes('idx_contracts_number_store')) throw err
      }
    }

    if (!created) {
      console.error('[v0] POST contract numbering failed:', lastError)
      return NextResponse.json({ error: 'Não foi possível gerar o número do contrato' }, { status: 500 })
    }

    return NextResponse.json(
      { ...created, total_value: Number(created.total_value) || 0 },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[v0] POST contract error:', error)
    return NextResponse.json({ error: 'Erro ao criar contrato' }, { status: 500 })
  }
}
