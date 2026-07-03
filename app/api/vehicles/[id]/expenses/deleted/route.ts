import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

async function getStoreId(request: NextRequest): Promise<number> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) throw new Error('Unauthorized')
  const { payload } = await jwtVerify(token, secret)
  return payload.storeId as number
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const storeId = await getStoreId(request)
    const sql = neon(process.env.DATABASE_URL!)

    const deleted = await sql`
      SELECT * FROM vehicle_expenses
      WHERE vehicle_id = ${parseInt(id)}
        AND store_id = ${storeId}
        AND is_deleted = true
      ORDER BY deleted_at DESC
    `

    return NextResponse.json(deleted.map(e => ({
      ...e,
      value: Number(e.value),
    })))
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
