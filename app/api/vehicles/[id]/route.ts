import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { verify } from 'jose'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const vehicleId = parseInt(id)

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()
    const data = updateVehicleSchema.parse(body)

    const current = await sql`
      SELECT * FROM vehicles WHERE id = ${vehicleId} AND store_id = ${storeId}
    `
    if (current.length === 0) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
    }

    const v = { ...current[0], ...data }

    const result = await sql`
      UPDATE vehicles SET
        plate = ${v.plate},
        brand = ${v.brand},
        model = ${v.model},
        version = ${v.version || null},
        manufacture_year = ${v.manufacture_year},
        model_year = ${v.model_year},
        purchase_value = ${v.purchase_value},
        sale_value = ${v.sale_value || null},
        renavam = ${v.renavam},
        chassis = ${v.chassis},
        updated_at = NOW()
      WHERE id = ${vehicleId} AND store_id = ${storeId}
      RETURNING *
    `
    return NextResponse.json(result[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar veículo' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const sql = neon(process.env.DATABASE_URL!)
    await sql`
      DELETE FROM vehicles WHERE id = ${parseInt(id)} AND store_id = ${storeId}
    `
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir veículo' }, { status: 500 })
  }
}
