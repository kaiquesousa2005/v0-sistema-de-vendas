import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jose'
import { sql } from '@neondatabase/serverless'
import { db } from '@/lib/db'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

const updateVehicleSchema = z.object({
  plate: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  version: z.string().optional(),
  manufacture_year: z.number().int().optional(),
  model_year: z.number().int().optional(),
  purchase_value: z.number().positive().optional(),
  sale_value: z.number().positive().optional(),
  renavam: z.string().min(1).optional(),
  chassis: z.string().min(1).optional(),
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

    const vehicle = await db(sql`
      SELECT * FROM vehicles
      WHERE id = ${parseInt(id)} AND store_id = ${storeId}
    `)

    if (vehicle.length === 0) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    return NextResponse.json(vehicle[0])
  } catch (error) {
    console.error('[v0] GET vehicle error:', error)
    return NextResponse.json({ error: 'Failed to fetch vehicle' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verified = await verify(token, secret)
    const storeId = verified.storeId as number

    const body = await request.json()
    const data = updateVehicleSchema.parse(body)

    const vehicleId = parseInt(id)
    
    // Fetch current vehicle first
    const currentVehicle = await db(sql`
      SELECT * FROM vehicles
      WHERE id = ${vehicleId} AND store_id = ${storeId}
    `)

    if (currentVehicle.length === 0) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    // Merge with existing data
    const updatedVehicle = { ...currentVehicle[0], ...data }

    const result = await db(sql`
      UPDATE vehicles
      SET 
        plate = ${updatedVehicle.plate},
        brand = ${updatedVehicle.brand},
        model = ${updatedVehicle.model},
        version = ${updatedVehicle.version || null},
        manufacture_year = ${updatedVehicle.manufacture_year},
        model_year = ${updatedVehicle.model_year},
        purchase_value = ${updatedVehicle.purchase_value},
        sale_value = ${updatedVehicle.sale_value || null},
        renavam = ${updatedVehicle.renavam},
        chassis = ${updatedVehicle.chassis},
        updated_at = NOW()
      WHERE id = ${vehicleId} AND store_id = ${storeId}
      RETURNING *
    `)

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('[v0] PUT vehicle error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verified = await verify(token, secret)
    const storeId = verified.storeId as number

    await db(sql`
      DELETE FROM vehicles
      WHERE id = ${parseInt(id)} AND store_id = ${storeId}
    `)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] DELETE vehicle error:', error)
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 })
  }
}
