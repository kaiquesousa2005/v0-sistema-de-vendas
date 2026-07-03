import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

const VALID_CATEGORIES = [
  'Bancos', 'Peças/Acessorio', 'Serviço Mecanico', 'Serviço Eletrico',
  'Pintura', 'Polimento', 'IPVA', 'Documentação', 'Combustivel', 'Outros'
] as const

const editSchema = z.object({
  description: z.string().min(1),
  category: z.enum(VALID_CATEGORIES as unknown as [string, ...string[]]),
  value: z.number().positive(),
  date: z.string().optional(),
})

const deleteSchema = z.object({
  reason: z.string().min(1, 'Informe o motivo da exclusão'),
})

async function getStoreId(request: NextRequest): Promise<number> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) throw new Error('Unauthorized')
  const { payload } = await jwtVerify(token, secret)
  return payload.storeId as number
}

// PUT - editar gasto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params
    const storeId = await getStoreId(request)
    const sql = neon(process.env.DATABASE_URL!)

    const body = await request.json()
    const data = editSchema.parse(body)

    const dateStr = data.date
      ? new Date(data.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    const result = await sql`
      UPDATE vehicle_expenses SET
        description = ${data.description},
        category = ${data.category},
        value = ${data.value},
        date = ${dateStr},
        updated_at = NOW()
      WHERE id = ${parseInt(expenseId)}
        AND vehicle_id = ${parseInt(id)}
        AND store_id = ${storeId}
        AND is_deleted = false
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Gasto não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ ...result[0], value: Number(result[0].value) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// DELETE - exclusão lógica com motivo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params
    const storeId = await getStoreId(request)
    const sql = neon(process.env.DATABASE_URL!)

    const body = await request.json()
    const { reason } = deleteSchema.parse(body)

    const result = await sql`
      UPDATE vehicle_expenses SET
        is_deleted = true,
        deleted_at = NOW(),
        deleted_reason = ${reason},
        updated_at = NOW()
      WHERE id = ${parseInt(expenseId)}
        AND vehicle_id = ${parseInt(id)}
        AND store_id = ${storeId}
        AND is_deleted = false
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Gasto não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
