import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { verify } from 'jose'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

const updateStoreSchema = z.object({
  store_name: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
})

async function getAdminId(request: NextRequest): Promise<number | null> {
  const token = request.cookies.get('admin-token')?.value
  if (!token) return null
  try {
    const verified = await verify(token, secret)
    return verified.adminId as number
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await getAdminId(request)
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const result = await sql`
      SELECT id, cpf, store_name, is_active, created_at
      FROM stores WHERE id = ${parseInt(id)} AND created_by = ${adminId}
    `
    if (result.length === 0) {
      return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 })
    }
    return NextResponse.json(result[0])
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar loja' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await getAdminId(request)
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const storeId = parseInt(id)

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()
    const data = updateStoreSchema.parse(body)

    const current = await sql`
      SELECT * FROM stores WHERE id = ${storeId} AND created_by = ${adminId}
    `
    if (current.length === 0) {
      return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 })
    }

    const s = current[0]
    const store_name = data.store_name ?? s.store_name
    const is_active = data.is_active !== undefined ? data.is_active : s.is_active

    const result = await sql`
      UPDATE stores SET
        store_name = ${store_name},
        is_active = ${is_active},
        updated_at = NOW()
      WHERE id = ${storeId} AND created_by = ${adminId}
      RETURNING id, cpf, store_name, is_active, created_at, updated_at
    `
    return NextResponse.json(result[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar loja' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await getAdminId(request)
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const sql = neon(process.env.DATABASE_URL!)
    await sql`DELETE FROM stores WHERE id = ${parseInt(id)} AND created_by = ${adminId}`
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir loja' }, { status: 500 })
  }
}
