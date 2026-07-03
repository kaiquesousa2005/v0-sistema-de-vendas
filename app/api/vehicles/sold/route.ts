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

// GET - Lista veículos vendidos com gastos e lucro calculado
export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)

    const vehicles = await sql`
      SELECT
        v.*,
        COALESCE(
          (SELECT SUM(e.value) FROM vehicle_expenses e
           WHERE e.vehicle_id = v.id AND e.is_deleted = false),
          0
        ) AS total_expenses
      FROM vehicles v
      WHERE v.store_id = ${storeId} AND v.status = 'vendido'
      ORDER BY v.sold_at DESC
    `

    const normalized = vehicles.map((v) => ({
      ...v,
      purchase_value: Number(v.purchase_value) || 0,
      sale_value: Number(v.sale_value) || 0,
      total_expenses: Number(v.total_expenses) || 0,
      manufacture_year: Number(v.manufacture_year),
      model_year: Number(v.model_year),
    }))

    return NextResponse.json(normalized)
  } catch (error) {
    console.error('[v0] GET sold error:', error)
    return NextResponse.json({ error: 'Erro ao buscar vendidos' }, { status: 500 })
  }
}

// POST - Marca um veículo como vendido
const soldSchema = z.object({
  vehicleId: z.number().int().positive(),
  saleValue: z.number().positive({ message: 'Valor de venda deve ser maior que zero' }),
})

export async function POST(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()
    const { vehicleId, saleValue } = soldSchema.parse(body)

    // Verificar se o veículo pertence à loja e está em estoque
    const check = await sql`
      SELECT id, status FROM vehicles
      WHERE id = ${vehicleId} AND store_id = ${storeId}
    `
    if (check.length === 0) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
    }
    if (check[0].status === 'vendido') {
      return NextResponse.json({ error: 'Veículo já foi marcado como vendido' }, { status: 409 })
    }

    const result = await sql`
      UPDATE vehicles
      SET status = 'vendido', sale_value = ${saleValue}, sold_at = NOW(), updated_at = NOW()
      WHERE id = ${vehicleId} AND store_id = ${storeId}
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[v0] POST sold error:', error)
    return NextResponse.json({ error: 'Erro ao marcar como vendido' }, { status: 500 })
  }
}
