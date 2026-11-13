import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getStoreId } from '@/lib/store-auth'

export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql`
      SELECT COUNT(*)::int AS count
      FROM vehicle_transfers
      WHERE store_id = ${storeId}
        AND status <> 'concluido'
        AND inspection_at IS NOT NULL
    `
    return NextResponse.json({ count: rows[0]?.count ?? 0 })
  } catch (error) {
    console.error('[v0] GET transfers scheduled-count error:', error)
    return NextResponse.json({ error: 'Erro ao contar vistorias agendadas' }, { status: 500 })
  }
}
