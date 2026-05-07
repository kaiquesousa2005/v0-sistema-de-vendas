import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { verify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

async function getStoreId(request: NextRequest): Promise<number | null> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  try {
    const verified = await verify(token, secret)
    return verified.storeId as number
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const result = await sql`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN status = 'em_estoque' THEN 1 END) as vehicles_in_stock,
        COUNT(CASE WHEN status = 'vendido' THEN 1 END) as vehicles_sold,
        COALESCE(SUM(CASE WHEN status = 'vendido' THEN sale_value ELSE 0 END), 0) as total_revenue,
        COALESCE((SELECT SUM(value) FROM vehicle_expenses WHERE store_id = ${storeId}), 0) as total_expenses
      FROM vehicles
      WHERE store_id = ${storeId}
    `
    return NextResponse.json(result[0])
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 })
  }
}
