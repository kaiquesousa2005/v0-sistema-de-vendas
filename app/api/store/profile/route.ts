import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'

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

export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql`
      SELECT id, store_name, trade_name, address, city, seller_name
      FROM stores
      WHERE id = ${storeId}
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 })
    }
    return NextResponse.json(rows[0])
  } catch (error) {
    console.error('[v0] GET store profile error:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados da loja' }, { status: 500 })
  }
}
