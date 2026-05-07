import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { verify } from 'jose'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

const expenseSchema = z.object({
  description: z.string().min(1),
  value: z.number().positive(),
  date: z.string().optional(),
})

async function getStoreId(request: NextRequest): Promise<number | null> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  try {
    const verified = await verify(token, secret)
    return verified.storeId as number
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const expenses = await sql`
      SELECT * FROM vehicle_expenses
      WHERE vehicle_id = ${parseInt(id)} AND store_id = ${storeId}
      ORDER BY date DESC
    `
    return NextResponse.json(expenses)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar gastos' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()
    const data = expenseSchema.parse(body)

    const expDate = data.date
      ? new Date(data.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    const result = await sql`
      INSERT INTO vehicle_expenses (vehicle_id, store_id, description, value, date)
      VALUES (${parseInt(id)}, ${storeId}, ${data.description}, ${data.value}, ${expDate})
      RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar gasto' }, { status: 500 })
  }
}
