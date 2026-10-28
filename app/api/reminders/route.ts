import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

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

const createSchema = z.object({
  vehicleId: z.number().int().positive({ message: 'Selecione um veículo' }),
  description: z.string().trim().min(1, 'Descreva o lembrete').max(2000),
})

export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const statusParam = request.nextUrl.searchParams.get('status') ?? ''
    const status = ['aberto', 'finalizado'].includes(statusParam) ? statusParam : ''

    const reminders = await sql`
      SELECT r.id, r.vehicle_id, r.description, r.status,
        to_char(r.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at,
        to_char(r.finished_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS finished_at,
        v.brand, v.model, v.plate, v.type
      FROM reminders r
      JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.store_id = ${storeId} AND (${status} = '' OR r.status = ${status})
      ORDER BY (r.status = 'finalizado') ASC, r.created_at DESC
      LIMIT 200
    `
    return NextResponse.json({ reminders })
  } catch (error) {
    console.error('[v0] GET reminders error:', error)
    return NextResponse.json({ error: 'Erro ao buscar lembretes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const { vehicleId, description } = createSchema.parse(await request.json())

    const vehicle = await sql`SELECT id FROM vehicles WHERE id = ${vehicleId} AND store_id = ${storeId}`
    if (vehicle.length === 0) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
    }

    const result = await sql`
      INSERT INTO reminders (store_id, vehicle_id, description)
      VALUES (${storeId}, ${vehicleId}, ${description})
      RETURNING id
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[v0] POST reminders error:', error)
    return NextResponse.json({ error: 'Erro ao criar lembrete' }, { status: 500 })
  }
}
