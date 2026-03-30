import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jose'
import { db } from '@/lib/db'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

const expenseSchema = z.object({
  description: z.string().min(1),
  value: z.number().positive(),
  date: z.string().date().optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verified = await verify(token, secret)
    const storeId = verified.storeId as number

    const expenses = await db`
      SELECT * FROM vehicle_expenses
      WHERE vehicle_id = ${parseInt(id)} AND store_id = ${storeId}
      ORDER BY date DESC
    `

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('[v0] GET expenses error:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verified = await verify(token, secret)
    const storeId = verified.storeId as number

    const body = await request.json()
    const data = expenseSchema.parse(body)

    const result = await db`
      INSERT INTO vehicle_expenses (
        vehicle_id, store_id, description, value, date
      ) VALUES (
        ${parseInt(id)}, ${storeId}, ${data.description}, ${data.value},
        ${data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
      )
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error('[v0] POST expense error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}
