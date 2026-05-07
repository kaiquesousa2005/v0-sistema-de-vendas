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

export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const vehicles = await sql`
      SELECT * FROM vehicles
      WHERE store_id = ${storeId} AND status = 'vendido'
      ORDER BY sold_at DESC
    `
    return NextResponse.json(vehicles)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar vendidos' }, { status: 500 })
  }
}

const soldSchema = z.object({
  vehicleId: z.number().int(),
  saleValue: z.number().positive(),
})

export async function POST(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()
    const { vehicleId, saleValue } = soldSchema.parse(body)

    const result = await sql`
      UPDATE vehicles
      SET status = 'vendido', sale_value = ${saleValue}, sold_at = NOW(), updated_at = NOW()
      WHERE id = ${vehicleId} AND store_id = ${storeId}
      RETURNING *
    `
    if (result.length === 0) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
    }
    return NextResponse.json(result[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao marcar como vendido' }, { status: 500 })
  }
}
