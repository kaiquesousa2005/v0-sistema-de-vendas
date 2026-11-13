import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getStoreIdFromRequest } from '@/lib/session'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  const storeId = await getStoreIdFromRequest(request)
  if (!storeId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const rows = await sql`SELECT store_name, trade_name FROM stores WHERE id = ${storeId}`
  const store = rows[0]
  if (!store) {
    return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 })
  }

  return NextResponse.json({
    storeName: String(store.trade_name || store.store_name || ''),
  })
}
