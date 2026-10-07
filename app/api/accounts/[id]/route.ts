import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')
async function getStoreId(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, secret)
    return payload.storeId as number
  } catch { return null }
}
const schema = z.object({
  description: z.string().trim().min(1), category: z.string().trim().min(1),
  due_date: z.string().min(1), amount: z.number().nonnegative().nullable().optional(),
  status: z.enum(['Pendente', 'Pago', 'Atrasado']), payment_date: z.string().optional().nullable(), notes: z.string().optional().nullable(),
})
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const data = schema.parse(await request.json())
    const sql = neon(process.env.DATABASE_URL!)
    const result = await sql`
      UPDATE accounts_payable SET description=${data.description}, category=${data.category}, due_date=${data.due_date}, amount=${data.amount ?? null}, status=${data.status}, payment_date=${data.payment_date || null}, notes=${data.notes || null}, updated_at=NOW()
      WHERE id=${Number(id)} AND store_id=${storeId}
      RETURNING id, description, category, to_char(due_date, 'YYYY-MM-DD') AS due_date, amount, status, to_char(payment_date, 'YYYY-MM-DD') AS payment_date, notes
    `
    if (!result.length) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    return NextResponse.json(result[0])
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    console.error('[v0] PUT account error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar conta' }, { status: 500 })
  }
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const sql = neon(process.env.DATABASE_URL!)
    const result = await sql`DELETE FROM accounts_payable WHERE id=${Number(id)} AND store_id=${storeId} RETURNING id`
    if (!result.length) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[v0] DELETE account error:', error)
    return NextResponse.json({ error: 'Erro ao excluir conta' }, { status: 500 })
  }
}
