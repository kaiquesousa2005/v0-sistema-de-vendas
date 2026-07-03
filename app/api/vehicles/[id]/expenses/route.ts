import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

const VALID_CATEGORIES = [
  'Bancos', 'Peças/Acessorio', 'Serviço Mecanico', 'Serviço Eletrico',
  'Pintura', 'Polimento', 'IPVA', 'Documentação', 'Combustivel', 'Outros'
] as const

const expenseSchema = z.object({
  description: z.string().min(1),
  category: z.enum(VALID_CATEGORIES as unknown as [string, ...string[]]),
  value: z.number().positive(),
  date: z.string().optional(),
})

async function getStoreId(request: NextRequest): Promise<number> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) throw new Error('Unauthorized')
  const { payload } = await jwtVerify(token, secret)
  return payload.storeId as number
}

// GET - listar gastos ativos (não deletados)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const storeId = await getStoreId(request)
    const sql = neon(process.env.DATABASE_URL!)

    const expenses = await sql`
      SELECT * FROM vehicle_expenses
      WHERE vehicle_id = ${parseInt(id)}
        AND store_id = ${storeId}
        AND is_deleted = false
      ORDER BY date DESC, created_at DESC
    `

    return NextResponse.json(expenses.map(e => ({
      ...e,
      value: Number(e.value),
    })))
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// GET deletados - rota separada via query param
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const storeId = await getStoreId(request)
    const sql = neon(process.env.DATABASE_URL!)

    const body = await request.json()
    const data = expenseSchema.parse(body)

    const dateStr = data.date
      ? new Date(data.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    const result = await sql`
      INSERT INTO vehicle_expenses (vehicle_id, store_id, description, category, value, date)
      VALUES (${parseInt(id)}, ${storeId}, ${data.description}, ${data.category}, ${data.value}, ${dateStr})
      RETURNING *
    `

    return NextResponse.json({ ...result[0], value: Number(result[0].value) }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
