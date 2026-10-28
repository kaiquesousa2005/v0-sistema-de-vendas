import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

async function getStoreId(request: NextRequest): Promise<number | null> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.storeId as number
  } catch {
    return null
  }
}

const updateSchema = z.object({
  vehicleName: z.string().trim().min(1, 'Informe o nome do veículo').max(150).optional(),
  vehiclePlate: z.string().trim().min(1, 'Informe a placa').max(20).transform((p) => p.toUpperCase()).optional(),
  description: z.string().trim().min(1, 'Descreva o lembrete').max(2000).optional(),
  status: z.enum(['aberto', 'finalizado']).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reminderId = Number.parseInt((await params).id)
  if (!reminderId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const data = updateSchema.parse(await request.json())

    const current = await sql`SELECT * FROM reminders WHERE id = ${reminderId} AND store_id = ${storeId}`
    if (current.length === 0) return NextResponse.json({ error: 'Lembrete não encontrado' }, { status: 404 })

    const status = data.status ?? current[0].status
    const result = await sql`
      UPDATE reminders SET
        vehicle_name = ${data.vehicleName ?? current[0].vehicle_name},
        vehicle_plate = ${data.vehiclePlate ?? current[0].vehicle_plate},
        description = ${data.description ?? current[0].description},
        status = ${status},
        finished_at = CASE WHEN ${status} = 'finalizado' THEN COALESCE(finished_at, NOW()) ELSE NULL END,
        updated_at = NOW()
      WHERE id = ${reminderId} AND store_id = ${storeId}
      RETURNING id, status
    `
    return NextResponse.json(result[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[v0] PATCH reminder error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar lembrete' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reminderId = Number.parseInt((await params).id)
  if (!reminderId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    await sql`DELETE FROM reminders WHERE id = ${reminderId} AND store_id = ${storeId}`
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[v0] DELETE reminder error:', error)
    return NextResponse.json({ error: 'Erro ao excluir lembrete' }, { status: 500 })
  }
}
