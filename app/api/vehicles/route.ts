import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

const vehicleSchema = z.object({
  type: z.enum(['carro', 'moto']),
  plate: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  version: z.string().optional(),
  manufacture_year: z.number().int(),
  model_year: z.number().int(),
  purchase_value: z.number().positive(),
  renavam: z.string().min(1),
  chassis: z.string().min(1),
})

async function getStoreId(request: NextRequest): Promise<number | null> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.storeId as number
  } catch {
    return null
  }
}

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

    const [countRows, vehicles] = await Promise.all([
      sql`
        SELECT COUNT(*)::int AS total
        FROM vehicles
        WHERE store_id = ${storeId} AND status = 'em_estoque'
          AND (
            ${search} = ''
            OR plate ILIKE ${like}
            OR brand ILIKE ${like}
            OR model ILIKE ${like}
            OR COALESCE(version, '') ILIKE ${like}
          )
      `,
      sql`
        SELECT * FROM vehicles
        WHERE store_id = ${storeId} AND status = 'em_estoque'
          AND (
            ${search} = ''
            OR plate ILIKE ${like}
            OR brand ILIKE ${like}
            OR model ILIKE ${like}
            OR COALESCE(version, '') ILIKE ${like}
          )
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
    ])

    const total = Number(countRows[0]?.total ?? 0)

    const normalized = vehicles.map((v) => ({
      ...v,
      purchase_value: Number(v.purchase_value) || 0,
      manufacture_year: Number(v.manufacture_year),
      model_year: Number(v.model_year),
    }))

    return NextResponse.json({
      vehicles: normalized,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    console.error('[v0] GET vehicles error:', error)
    return NextResponse.json({ error: 'Erro ao buscar veículos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()
    const data = vehicleSchema.parse(body)

    // Verificar placa duplicada dentro da mesma loja
    const existing = await sql`
      SELECT id FROM vehicles
      WHERE store_id = ${storeId} AND UPPER(plate) = UPPER(${data.plate})
    `
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Já existe um veículo com essa placa cadastrado.' }, { status: 409 })
    }

    const result = await sql`
      INSERT INTO vehicles (
        store_id, type, plate, brand, model, version,
        manufacture_year, model_year, purchase_value, renavam, chassis
      ) VALUES (
        ${storeId}, ${data.type}, ${data.plate.toUpperCase()}, ${data.brand}, ${data.model},
        ${data.version || null}, ${data.manufacture_year}, ${data.model_year},
        ${data.purchase_value}, ${data.renavam}, ${data.chassis}
      )
      RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar veículo' }, { status: 500 })
  }
}
