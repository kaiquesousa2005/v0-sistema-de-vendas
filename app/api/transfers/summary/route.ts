import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getStoreId } from '@/lib/store-auth'

export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'nao_transferido')::int AS nao_transferido,
        COUNT(*) FILTER (WHERE status = 'em_processo')::int AS em_processo,
        COUNT(*) FILTER (WHERE status = 'concluido')::int AS concluido
      FROM vehicle_transfers WHERE store_id = ${storeId}
    `
    return NextResponse.json(rows[0])
  } catch (error) {
    console.error('[v0] GET transfers summary error:', error)
    return NextResponse.json({ error: 'Erro ao carregar resumo' }, { status: 500 })
  }
}
