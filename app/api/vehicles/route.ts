import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jose'
import { db } from '@/lib/db'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

const vehicleSchema = z.object({
  type: z.enum(['carro', 'moto']),
  plate: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  version: z.string().optional(),
  manufacture_year: z.number().int(),
  model_year: z.number().int(),
  purchase_value: z.number().positive(),
  renavam: z.string().min(1),
  chassis: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verified = await verify(token, secret)
    const storeId = verified.storeId as number

    const vehicles = await db`
      SELECT * FROM vehicles
      WHERE store_id = ${storeId}
      ORDER BY created_at DESC
    `

    return NextResponse.json(vehicles)
  } catch (error) {
    console.error('[v0] GET vehicles error:', error)
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verified = await verify(token, secret)
    const storeId = verified.storeId as number

    const body = await request.json()
    const data = vehicleSchema.parse(body)

    const result = await db`
      INSERT INTO vehicles (
        store_id, type, plate, brand, model, version,
        manufacture_year, model_year, purchase_value, renavam, chassis
      ) VALUES (
        ${storeId}, ${data.type}, ${data.plate}, ${data.brand}, ${data.model},
        ${data.version || null}, ${data.manufacture_year}, ${data.model_year},
        ${data.purchase_value}, ${data.renavam}, ${data.chassis}
      )
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error('[v0] POST vehicles error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 })
  }
}
