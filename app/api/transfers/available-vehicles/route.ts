import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getStoreId } from '@/lib/store-auth'

export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 50)
  const search = q ? `%${q}%` : ''

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const vehicles = await sql`
      SELECT v.id, v.plate, v.brand, v.model, v.version, v.model_year, v.status
      FROM vehicles v
      WHERE v.store_id = ${storeId}
        AND NOT EXISTS (SELECT 1 FROM vehicle_transfers t WHERE t.vehicle_id = v.id)
        AND (${search} = '' OR v.plate ILIKE ${search} OR v.brand ILIKE ${search} OR v.model ILIKE ${search})
      ORDER BY v.created_at DESC
      LIMIT 20
    `
    return NextResponse.json({ vehicles })
  } catch (error) {
    console.error('[v0] GET available vehicles error:', error)
    return NextResponse.json({ error: 'Erro ao buscar veículos' }, { status: 500 })
  }
}
