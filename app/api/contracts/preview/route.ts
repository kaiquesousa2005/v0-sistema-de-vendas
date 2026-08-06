import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'
import { z } from 'zod'
import { buildSaleSnapshot, salePreviewSchema } from '@/lib/contract-snapshot'

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

/**
 * Monta o snapshot do contrato SEM gravar nada.
 *
 * Usa o mesmo `buildSaleSnapshot` da criação, então a prévia é idêntica ao
 * documento final — e aceita formulário incompleto sem falhar.
 */
export async function POST(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = salePreviewSchema.parse(await request.json())
    const sql = neon(process.env.DATABASE_URL!)
    const { snapshot } = await buildSaleSnapshot(sql, storeId, data)

    return NextResponse.json({ data: snapshot, contract_date: data.contract_date })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[v0] POST contract preview error:', error)
    return NextResponse.json({ error: 'Erro ao gerar prévia' }, { status: 500 })
  }
}
