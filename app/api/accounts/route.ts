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
  } catch {
    return null
  }
}

const accountSchema = z.object({
  description: z.string().trim().min(1, 'Descrição obrigatória'),
  category: z.string().trim().min(1, 'Categoria obrigatória'),
  due_date: z.string().min(1, 'Data de vencimento obrigatória'),
  amount: z.number().nonnegative('Valor inválido').nullable().optional(),
  status: z.enum(['Pendente', 'Pago', 'Atrasado']).default('Pendente'),
  payment_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const sp = request.nextUrl.searchParams
    const month = Number(sp.get('month') || new Date().getMonth() + 1)
    const year = Number(sp.get('year') || new Date().getFullYear())
    const rows = await sql`
      SELECT id, description, category, to_char(due_date, 'YYYY-MM-DD') AS due_date, amount, status, to_char(payment_date, 'YYYY-MM-DD') AS payment_date, notes
      FROM accounts_payable
      WHERE store_id = ${storeId}
        AND EXTRACT(MONTH FROM due_date) = ${month}
        AND EXTRACT(YEAR FROM due_date) = ${year}
      ORDER BY accounts_payable.due_date ASC, description ASC
    `
    const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
    const paid = rows.filter((row) => row.status === 'Pago').reduce((sum, row) => sum + Number(row.amount || 0), 0)
    const pending = rows.filter((row) => row.status !== 'Pago').reduce((sum, row) => sum + Number(row.amount || 0), 0)
    return NextResponse.json({ accounts: rows, totals: { total, paid, pending }, month, year })
  } catch (error) {
    console.error('[v0] GET accounts error:', error)
    return NextResponse.json({ error: 'Erro ao buscar contas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const data = accountSchema.parse(await request.json())
    const sql = neon(process.env.DATABASE_URL!)
    const result = await sql`
      INSERT INTO accounts_payable (store_id, description, category, due_date, amount, status, payment_date, notes)
      VALUES (${storeId}, ${data.description}, ${data.category}, ${data.due_date}, ${data.amount ?? null}, ${data.status}, ${data.payment_date || null}, ${data.notes || null})
      RETURNING id, description, category, to_char(due_date, 'YYYY-MM-DD') AS due_date, amount, status, to_char(payment_date, 'YYYY-MM-DD') AS payment_date, notes
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    console.error('[v0] POST account error:', error)
    return NextResponse.json({ error: 'Erro ao cadastrar conta' }, { status: 500 })
  }
}
