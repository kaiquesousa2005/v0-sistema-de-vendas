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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const contractId = Number.parseInt(id, 10)
  if (!Number.isFinite(contractId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql`
      SELECT id, type, contract_number, customer_id, vehicle_id,
             customer_name, vehicle_label, total_value, contract_date, data, created_at
      FROM contracts
      WHERE id = ${contractId} AND store_id = ${storeId}
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    const contract = rows[0]
    return NextResponse.json({
      ...contract,
      total_value: Number(contract.total_value) || 0,
    })
  } catch (error) {
    console.error('[v0] GET contract error:', error)
    return NextResponse.json({ error: 'Erro ao buscar contrato' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const contractId = Number.parseInt(id, 10)
  if (!Number.isFinite(contractId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql`
      DELETE FROM contracts
      WHERE id = ${contractId} AND store_id = ${storeId}
      RETURNING id
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] DELETE contract error:', error)
    return NextResponse.json({ error: 'Erro ao excluir contrato' }, { status: 500 })
  }
}
